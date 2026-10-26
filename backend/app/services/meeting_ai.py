"""Meeting intelligence: optional Google Gemini analysis with a deterministic fallback.

The Gemini path is used only when GEMINI_API_KEY is set. Every AI response is
parsed as JSON, validated with Pydantic and then checked against the
transcript (segment IDs must exist, owners must be real speakers). Any
failure falls back to the rule-based engine, so the API always answers.
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.schemas import ActionItem, AnalysisResult, AnswerResult, Decision, OpenQuestion, TranscriptPayload
from app.services import rules
from app.services.rules import format_timestamp

logger = logging.getLogger("bridgetalk.ai")

_ANALYZE_PROMPT = """You extract meeting intelligence from a transcript. Use ONLY what the transcript states.
Rules:
- Decisions: only explicit agreements or decisions. Never invent decisions.
- Action items: only explicit commitments or requests. "owner" is the speaker's full name ONLY if the transcript
  states who will do it, otherwise null. "deadline" ONLY if a deadline is explicitly stated, otherwise null.
- Open questions: questions raised but not answered.
- Every item must cite the segment IDs (like "s3") that support it.
- The summary is 2-3 plain sentences, in English.
Respond with JSON only:
{"summary": str, "decisions": [{"text": str, "source_segment_ids": [str]}],
 "action_items": [{"task": str, "owner": str|null, "deadline": str|null, "source_segment_ids": [str]}],
 "open_questions": [{"text": str, "source_segment_ids": [str]}]}"""

_ASK_PROMPT = """You answer questions about a meeting using ONLY the transcript provided.
- Answer concisely (1-3 sentences) in the same language as the question.
- Cite the supporting segment IDs.
- If the transcript does not contain the answer, set "grounded" to false and say clearly that the meeting
  does not provide enough information. Do not guess.
Respond with JSON only: {"answer": str, "grounded": bool, "source_segment_ids": [str]}"""


class _RawActionItem(BaseModel):
    task: str
    owner: str | None = None
    deadline: str | None = None
    source_segment_ids: list[str]


class _RawAnalysis(BaseModel):
    summary: str
    decisions: list[Decision]
    action_items: list[_RawActionItem]
    open_questions: list[OpenQuestion] = []


class _RawAnswer(BaseModel):
    answer: str
    grounded: bool
    source_segment_ids: list[str] = []


def ai_model() -> str:
    return get_settings().gemini_model.strip()


def _models() -> list[str]:
    fallbacks = [m.strip() for m in get_settings().gemini_fallback_models.split(",")]
    return list(dict.fromkeys(m for m in [ai_model(), *fallbacks] if m))


def ai_configured() -> bool:
    return bool(get_settings().gemini_api_key.get_secret_value().strip())


@lru_cache(maxsize=1)
def _client() -> Any:
    from google import genai  # Imported lazily so the app runs without the key.
    from google.genai import types

    return genai.Client(
        api_key=get_settings().gemini_api_key.get_secret_value().strip(),
        http_options=types.HttpOptions(timeout=30_000, retry_options=types.HttpRetryOptions(attempts=1)),
    )


def _aliases(payload: TranscriptPayload) -> dict[str, str]:
    """Short "s1", "s2"... labels for the model; stored segment IDs are long ObjectIds it can garble."""
    return {f"s{i}": seg.id for i, seg in enumerate(payload.segments, start=1)}


def _transcript_text(payload: TranscriptPayload) -> str:
    names = {s.id: f"{s.name} ({s.role})" if s.role else s.name for s in payload.speakers}
    lines = [
        f"[{alias}] {format_timestamp(seg.start_seconds)} {names.get(seg.speaker_id, seg.speaker_id)}: "
        f"{seg.text.get('en') or seg.text.get(seg.original_language, '')}"
        for alias, seg in zip(_aliases(payload), payload.segments)
    ]
    return f"Meeting: {payload.title}\n" + "\n".join(lines)


def _complete_json(system: str, user: str) -> dict[str, Any]:
    from google.genai import errors, types

    config = types.GenerateContentConfig(
        system_instruction=system, temperature=0, response_mime_type="application/json"
    )
    last_error: Exception | None = None
    for model in _models():
        try:
            response = _client().models.generate_content(model=model, contents=user, config=config)
            return json.loads(response.text or "")
        except errors.APIError as exc:
            # Overloaded or timed out (5xx), rate-limited (429) or retired (404) models: try the next one.
            if exc.code not in (404, 429) and not 500 <= (exc.code or 0) < 600:
                raise
            logger.info("Gemini model %s unavailable (%s); trying the next one.", model, exc.code)
            last_error = exc
        except httpx.TimeoutException as exc:
            logger.info("Gemini model %s timed out; trying the next one.", model)
            last_error = exc
    raise last_error or RuntimeError("No Gemini model configured.")


def _valid_ids(ids: list[str], aliases: dict[str, str]) -> list[str]:
    """Map the model's short labels back to real segment IDs, dropping any it invented."""
    return [aliases[i] for i in dict.fromkeys(ids) if i in aliases]


def _match_owner(owner: str | None, payload: TranscriptPayload) -> str | None:
    """Keep an owner only if it names a real speaker; never accept invented people."""
    if not owner:
        return None
    wanted = owner.strip().lower()
    for speaker in payload.speakers:
        full = speaker.name.lower()
        if wanted == full or wanted == full.split()[0]:
            return speaker.name
    return None


def _sanitize_analysis(raw: _RawAnalysis, payload: TranscriptPayload) -> AnalysisResult:
    known = _aliases(payload)
    decisions = [
        Decision(text=d.text, source_segment_ids=ids)
        for d in raw.decisions
        if (ids := _valid_ids(d.source_segment_ids, known))
    ]
    items: list[ActionItem] = []
    for item in raw.action_items:
        ids = _valid_ids(item.source_segment_ids, known)
        if not ids or not item.task.strip():
            continue
        items.append(
            ActionItem(
                id=f"a{len(items) + 1}",
                task=item.task.strip(),
                owner=_match_owner(item.owner, payload),
                deadline=(item.deadline or "").strip() or None,
                source_segment_ids=ids,
            )
        )
    questions = [
        OpenQuestion(text=q.text, source_segment_ids=ids)
        for q in raw.open_questions
        if (ids := _valid_ids(q.source_segment_ids, known))
    ]
    return AnalysisResult(
        summary=raw.summary.strip(), decisions=decisions, action_items=items, open_questions=questions, mode="gemini"
    )


def analyze_meeting(payload: TranscriptPayload) -> AnalysisResult:
    if ai_configured():
        try:
            raw = _RawAnalysis.model_validate(_complete_json(_ANALYZE_PROMPT, _transcript_text(payload)))
            result = _sanitize_analysis(raw, payload)
            if result.summary:
                return result
        except (ValidationError, json.JSONDecodeError) as exc:
            logger.warning("AI analysis returned an invalid structure (%s); using rules.", type(exc).__name__)
        except Exception as exc:  # Network, auth, rate limit: never leak details.
            logger.warning("AI analysis failed (%s); using rules.", type(exc).__name__)
    return rules.analyze(payload)


def answer_question(payload: TranscriptPayload, question: str) -> AnswerResult:
    if ai_configured():
        try:
            user = f"{_transcript_text(payload)}\n\nQuestion: {question}"
            raw = _RawAnswer.model_validate(_complete_json(_ASK_PROMPT, user))
            ids = _valid_ids(raw.source_segment_ids, _aliases(payload))
            grounded = raw.grounded and bool(ids)
            text = raw.answer.strip() if grounded or not raw.grounded else rules.NOT_ENOUGH_INFO
            if text:
                return AnswerResult(answer=text, grounded=grounded, source_segment_ids=ids, mode="gemini")
        except (ValidationError, json.JSONDecodeError) as exc:
            logger.warning("AI answer returned an invalid structure (%s); using rules.", type(exc).__name__)
        except Exception as exc:
            logger.warning("AI answer failed (%s); using rules.", type(exc).__name__)
    return rules.answer(payload, question)


_TRANSLATE_PROMPT = """You translate meeting transcript lines between English (en), Bengali (bn) and Hindi (hi).
For every input line, translate its text into each of the three languages ("en", "bn", "hi").
Keep the meaning, tone, names and numbers exactly; do not summarise or add anything.
For the line's own language, return the original text unchanged.
Respond with JSON only: {"lines": [{"id": str, "en": str, "bn": str, "hi": str}]}"""

_TRANSLATE_BATCH = 40
LANGUAGE_CODES = ("en", "bn", "hi")


class _RawTranslation(BaseModel):
    id: str
    en: str = ""
    bn: str = ""
    hi: str = ""


class _RawTranslations(BaseModel):
    lines: list[_RawTranslation]


def translate_lines(lines: list[tuple[str, str, str]]) -> dict[str, dict[str, str]]:
    """Translate (id, language, text) lines into en/bn/hi with Gemini.

    Returns only the translations that came back valid; callers keep the original
    text for anything missing, so a failure never loses user input.
    """
    if not ai_configured() or not lines:
        return {}
    result: dict[str, dict[str, str]] = {}
    for start in range(0, len(lines), _TRANSLATE_BATCH):
        batch = lines[start : start + _TRANSLATE_BATCH]
        payload = json.dumps([{"id": i, "language": lang, "text": text} for i, lang, text in batch], ensure_ascii=False)
        try:
            raw = _RawTranslations.model_validate(_complete_json(_TRANSLATE_PROMPT, payload))
        except Exception as exc:  # Keep going: untranslated lines still show their original text.
            logger.warning("Translation batch failed (%s); keeping originals.", type(exc).__name__)
            continue
        known = {i for i, _, _ in batch}
        for item in raw.lines:
            if item.id in known:
                result[item.id] = {code: text.strip() for code in LANGUAGE_CODES if (text := getattr(item, code))}
    return result
