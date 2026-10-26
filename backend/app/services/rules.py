"""Deterministic, rule-based meeting intelligence.

Used when no Gemini key is configured or the AI call fails. It only extracts
what the English transcript text states explicitly: owners come from the
speaker who said "I will ...", deadlines only from explicit phrases such as
"by Friday". Nothing is inferred beyond that.

frontend/lib/local-intelligence.ts mirrors this logic for offline use.
"""

from __future__ import annotations

import math
import re
from collections.abc import Iterable

from app.schemas import (
    ActionItem,
    AnalysisResult,
    AnswerResult,
    Decision,
    OpenQuestion,
    Segment,
    Speaker,
    TranscriptPayload,
)

NOT_ENOUGH_INFO = "The meeting does not provide enough information to answer that."

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_DECISION = re.compile(r"\b(let's decide|we decided|decided|agreed|let's go with|we will go with)\b", re.I)
_COMMITMENT = re.compile(r"^(?:i will|i'll|i am going to|i'm going to)\s+(.+)$", re.I)
_DELEGATION = re.compile(r"^(?:someone|somebody)\s+(?:also\s+)?(?:needs? to|has to|should)\s+(.+)$", re.I)
_DAY = r"(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
_DEADLINE = re.compile(
    rf"\s*\b(?:by|on|due|before)\s+((?:next\s+|this\s+)?{_DAY}|tomorrow|today|tonight|"
    r"end of (?:the )?(?:day|week|month)|next week|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9})\b",
    re.I,
)
_TIME_EXPRESSION = re.compile(
    rf"\b({_DAY}|tomorrow|next week|next month|end of|deadline|\d{{1,2}}(?:st|nd|rd|th)?\s+[a-z]{{3,9}})\b",
    re.I,
)
_UNRESOLVED = re.compile(
    r"(don't have an answer|no answer yet|not sure|don't know|keep \w+ open|leave \w+ open|to be decided|\btbd\b)",
    re.I,
)
_LEADING_FILLER = re.compile(r"^(?:yes|yeah|okay|ok|great|so|then)\b[,.!]?\s*", re.I)

# Intent patterns for question answering.
_INTENT_ACTIONS = re.compile(r"(action items?|tasks?|to-?dos?|next steps?|responsib|assigned|who (?:is|will|should) (?:do|own|handle))", re.I)
_INTENT_DECISIONS = re.compile(r"(decid|decision|agree|conclu|outcome)", re.I)
_INTENT_OPEN = re.compile(r"(open questions?|unresolved|unanswered|still open|pending questions?)", re.I)
_INTENT_SUMMARY = re.compile(r"(summar|recap|tl;?dr|overview|what (?:was|is) (?:this|the) meeting about)", re.I)
_INTENT_TEMPORAL = re.compile(r"\b(when|date|deadline|due|what day|what time|how long)\b", re.I)

_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "will", "would", "do", "does", "did",
    "to", "of", "in", "on", "for", "and", "or", "what", "who", "whom", "which", "how", "why", "when",
    "it", "this", "that", "these", "those", "we", "i", "you", "they", "he", "she", "about", "with",
    "at", "by", "from", "any", "there", "their", "our", "us", "me", "my", "can", "could", "should",
    "have", "has", "had", "say", "said", "tell", "meeting", "team", "please", "also", "s", "date",
    "deadline", "due", "day", "time",
}
# Small synonym map so common paraphrases still match the transcript.
_SYNONYMS = {
    "price": "price", "pricing": "price", "cost": "price", "free": "price", "paid": "price", "charge": "price",
    "bug": "bug", "issue": "bug", "defect": "bug", "problem": "bug",
    "release": "launch", "ship": "launch", "launch": "launch",
    "iphone": "ios", "apple": "ios", "mail": "email", "user": "user", "customer": "user",
    "screenshot": "screenshot", "store": "store", "playstore": "store",
}


def format_timestamp(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 60:02d}:{total % 60:02d}"


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT.split(text.strip()) if s.strip()]


def _capitalize(text: str) -> str:
    text = text.strip()
    return text[:1].upper() + text[1:] if text else text


def _lower_first(text: str) -> str:
    return text[:1].lower() + text[1:] if text else text


def _clean_clause(text: str) -> str:
    return _capitalize(text.strip().rstrip(".!;, "))


def _english(segment: Segment) -> str:
    return segment.text.get("en", "")


def _speaker_lookup(speakers: Iterable[Speaker]) -> dict[str, Speaker]:
    return {speaker.id: speaker for speaker in speakers}


def extract_decisions(segments: list[Segment]) -> list[Decision]:
    decisions: list[Decision] = []
    for index, segment in enumerate(segments):
        sentences = _sentences(_english(segment))
        for position, sentence in enumerate(sentences):
            if sentence.endswith("?") or not _DECISION.search(sentence):
                continue
            if ":" in sentence and _DECISION.search(sentence.split(":", 1)[0]):
                content = sentence.split(":", 1)[1]
            else:
                content = _LEADING_FILLER.sub("", _DECISION.sub("", sentence)).strip(" ,.")
                if len(content.split()) < 3:
                    content = " ".join(sentences[position + 1 :])
            if len(content.split()) < 3:
                continue
            sources = [segment.id]
            previous = segments[index - 1] if index > 0 else None
            if previous and _english(previous).rstrip().endswith("?"):
                sources.insert(0, previous.id)
            decisions.append(Decision(text=_clean_clause(content) + ".", source_segment_ids=sources))
            break
    return decisions


def extract_action_items(segments: list[Segment], speakers: dict[str, Speaker]) -> list[ActionItem]:
    items: list[ActionItem] = []
    for segment in segments:
        for sentence in _sentences(_english(segment)):
            sentence = _LEADING_FILLER.sub("", sentence)
            owner: str | None = None
            if match := _COMMITMENT.match(sentence):
                speaker = speakers.get(segment.speaker_id)
                owner = speaker.name if speaker else None
            elif not (match := _DELEGATION.match(sentence)):
                continue
            task = match.group(1)
            deadline: str | None = None
            if deadline_match := _DEADLINE.search(task):
                deadline = _capitalize(deadline_match.group(1))
                task = task[: deadline_match.start()] + task[deadline_match.end() :]
            items.append(
                ActionItem(
                    id=f"a{len(items) + 1}",
                    task=_clean_clause(task),
                    owner=owner,
                    deadline=deadline,
                    source_segment_ids=[segment.id],
                )
            )
    return items


def extract_open_questions(segments: list[Segment]) -> list[OpenQuestion]:
    questions: list[OpenQuestion] = []
    for index, segment in enumerate(segments):
        asked = [s for s in _sentences(_english(segment)) if s.endswith("?")]
        if not asked:
            continue
        replies = [s for s in segments[index + 1 : index + 3] if s.speaker_id != segment.speaker_id]
        unresolved_reply = next((r for r in replies if _UNRESOLVED.search(_english(r))), None)
        if replies and unresolved_reply is None:
            continue
        text = asked[-1].split(":", 1)[-1] if ":" in asked[-1] else asked[-1]
        sources = [segment.id] + ([unresolved_reply.id] if unresolved_reply else [])
        questions.append(OpenQuestion(text=_capitalize(text), source_segment_ids=sources))
    return questions


def _join_names(names: list[str]) -> str:
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + f" and {names[-1]}"


def build_summary(
    payload: TranscriptPayload,
    decisions: list[Decision],
    items: list[ActionItem],
    questions: list[OpenQuestion],
) -> str:
    speakers = _speaker_lookup(payload.speakers)
    spoken_ids = list(dict.fromkeys(s.speaker_id for s in payload.segments))
    names = [speakers[sid].name.split()[0] for sid in spoken_ids if sid in speakers]
    language_names = {"en": "English", "bn": "Bengali", "hi": "Hindi"}
    languages = list(dict.fromkeys(language_names[s.original_language] for s in payload.segments))

    parts = [f"{_join_names(names)} discussed the {payload.title} in {_join_names(languages)}."]
    if decisions:
        parts.append("Decisions: " + "; ".join(_lower_first(d.text.rstrip(".")) for d in decisions) + ".")
    else:
        parts.append("No explicit decisions were recorded.")
    if items:
        unassigned = sum(1 for item in items if item.owner is None)
        note = f" ({unassigned} without an owner)" if unassigned else ""
        parts.append(f"{len(items)} action item{'s' if len(items) != 1 else ''} captured{note}.")
    if questions:
        parts.append("Still open: " + " ".join(_lower_first(q.text) for q in questions))
    return " ".join(parts)


def analyze(payload: TranscriptPayload) -> AnalysisResult:
    speakers = _speaker_lookup(payload.speakers)
    decisions = extract_decisions(payload.segments)
    items = extract_action_items(payload.segments, speakers)
    questions = extract_open_questions(payload.segments)
    return AnalysisResult(
        summary=build_summary(payload, decisions, items, questions),
        decisions=decisions,
        action_items=items,
        open_questions=questions,
        mode="rules",
    )


# --- Question answering -----------------------------------------------------


def _stem(word: str) -> str:
    word = word.removesuffix("'s")
    if word in _SYNONYMS:
        return _SYNONYMS[word]
    for suffix, minimum in (("ing", 6), ("ed", 5), ("es", 5), ("s", 4)):
        if word.endswith(suffix) and len(word) >= minimum:
            word = word[: -len(suffix)]
            break
    return _SYNONYMS.get(word, word)


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9']+", text.lower())
    return {_stem(w) for w in words if w not in _STOPWORDS and len(w) > 1}


def _quote(segment: Segment, speakers: dict[str, Speaker]) -> str:
    speaker = speakers.get(segment.speaker_id)
    name = speaker.name if speaker else "A participant"
    return f"{name} ({format_timestamp(segment.start_seconds)}): “{_english(segment)}”"


def _describe_item(item: ActionItem) -> str:
    owner = item.owner or "No owner assigned"
    deadline = f", due {item.deadline}" if item.deadline else ", no deadline stated"
    return f"{item.task} ({owner}{deadline})"


def answer(payload: TranscriptPayload, question: str) -> AnswerResult:
    speakers = _speaker_lookup(payload.speakers)
    analysis = analyze(payload)

    if _INTENT_SUMMARY.search(question):
        return AnswerResult(answer=analysis.summary, grounded=True, source_segment_ids=[s.id for s in payload.segments[:1]])
    if _INTENT_OPEN.search(question):
        if not analysis.open_questions:
            return AnswerResult(answer="No unresolved questions were found in the transcript.", grounded=True)
        text = "Unresolved: " + " ".join(q.text for q in analysis.open_questions)
        ids = [i for q in analysis.open_questions for i in q.source_segment_ids]
        return AnswerResult(answer=text, grounded=True, source_segment_ids=ids)
    if _INTENT_ACTIONS.search(question):
        if not analysis.action_items:
            return AnswerResult(answer="No action items were stated in the meeting.", grounded=True)
        text = f"{len(analysis.action_items)} action items: " + "; ".join(_describe_item(i) for i in analysis.action_items) + "."
        ids = [i for item in analysis.action_items for i in item.source_segment_ids]
        return AnswerResult(answer=text, grounded=True, source_segment_ids=ids)
    if _INTENT_DECISIONS.search(question) and not _INTENT_TEMPORAL.search(question):
        if not analysis.decisions:
            return AnswerResult(answer="No explicit decisions were recorded in the meeting.", grounded=True)
        text = "Decisions: " + " ".join(d.text for d in analysis.decisions)
        ids = [i for d in analysis.decisions for i in d.source_segment_ids]
        return AnswerResult(answer=text, grounded=True, source_segment_ids=ids)

    question_tokens = _tokens(question)
    if not question_tokens:
        message = NOT_ENOUGH_INFO
        if not re.search(r"[a-zA-Z]", question):
            message += " The offline assistant only understands English questions; configure Gemini for Bengali or Hindi questions."
        return AnswerResult(answer=message, grounded=False)

    documents = {
        s.id: _tokens(_english(s) + " " + (speakers[s.speaker_id].name if s.speaker_id in speakers else ""))
        for s in payload.segments
    }
    total = len(documents)
    frequency = {t: sum(1 for tokens in documents.values() if t in tokens) for t in question_tokens}
    scores = {
        s.id: sum(math.log(total / frequency[t]) + 0.1 for t in question_tokens if t in documents[s.id])
        for s in payload.segments
    }
    ranked = sorted((s for s in payload.segments if scores[s.id] >= 1.0), key=lambda s: -scores[s.id])
    if not ranked:
        return AnswerResult(answer=NOT_ENOUGH_INFO, grounded=False)

    best = scores[ranked[0].id]
    top = [s for s in ranked if scores[s.id] >= best * 0.6][:2]

    if _INTENT_TEMPORAL.search(question):
        timed = [s for s in top if _TIME_EXPRESSION.search(_english(s))]
        if not timed:
            related = _quote(top[0], speakers)
            return AnswerResult(
                answer=f"{NOT_ENOUGH_INFO} No date or time is stated for this. Closest related discussion: {related}",
                grounded=False,
                source_segment_ids=[top[0].id],
            )
        top = timed

    open_ids = {i for q in analysis.open_questions for i in q.source_segment_ids}
    if any(s.id in open_ids for s in top):
        related = [s for s in payload.segments if s.id in open_ids]
        quotes = " ".join(_quote(s, speakers) for s in related)
        return AnswerResult(
            answer=f"This was raised but not resolved in the meeting. {quotes}",
            grounded=True,
            source_segment_ids=[s.id for s in related],
        )

    ordered = sorted(top, key=lambda s: s.start_seconds)
    quotes = " ".join(_quote(s, speakers) for s in ordered)
    return AnswerResult(answer=f"From the transcript: {quotes}", grounded=True, source_segment_ids=[s.id for s in ordered])
