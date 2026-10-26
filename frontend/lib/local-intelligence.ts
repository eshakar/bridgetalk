// In-browser deterministic meeting intelligence.
// Mirrors backend/app/services/rules.py so the demo works when the API is down.
// It only extracts what the English transcript states explicitly.

import type {
  ActionItem,
  AnalysisResult,
  AnswerResult,
  Decision,
  Meeting,
  OpenQuestion,
  Segment,
  Speaker,
} from "@/types/meeting";
import { formatTimestamp, LANGUAGE_NAMES } from "@/lib/utils";

export const NOT_ENOUGH_INFO = "The meeting does not provide enough information to answer that.";

const DAY = "(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)";
const DECISION = /\b(let's decide|we decided|decided|agreed|let's go with|we will go with)\b/i;
const COMMITMENT = /^(?:i will|i'll|i am going to|i'm going to)\s+(.+)$/i;
const DELEGATION = /^(?:someone|somebody)\s+(?:also\s+)?(?:needs? to|has to|should)\s+(.+)$/i;
const DEADLINE = new RegExp(
  `\\s*\\b(?:by|on|due|before)\\s+((?:next\\s+|this\\s+)?${DAY}|tomorrow|today|tonight|end of (?:the )?(?:day|week|month)|next week|\\d{1,2}(?:st|nd|rd|th)?\\s+[a-z]{3,9})\\b`,
  "i",
);
const TIME_EXPRESSION = new RegExp(
  `\\b(${DAY}|tomorrow|next week|next month|end of|deadline|\\d{1,2}(?:st|nd|rd|th)?\\s+[a-z]{3,9})\\b`,
  "i",
);
const UNRESOLVED = /(don't have an answer|no answer yet|not sure|don't know|keep \w+ open|leave \w+ open|to be decided|\btbd\b)/i;
const LEADING_FILLER = /^(?:yes|yeah|okay|ok|great|so|then)\b[,.!]?\s*/i;

const INTENT_ACTIONS = /(action items?|tasks?|to-?dos?|next steps?|responsib|assigned|who (?:is|will|should) (?:do|own|handle))/i;
const INTENT_DECISIONS = /(decid|decision|agree|conclu|outcome)/i;
const INTENT_OPEN = /(open questions?|unresolved|unanswered|still open|pending questions?)/i;
const INTENT_SUMMARY = /(summar|recap|tl;?dr|overview|what (?:was|is) (?:this|the) meeting about)/i;
const INTENT_TEMPORAL = /\b(when|date|deadline|due|what day|what time|how long)\b/i;

const STOPWORDS = new Set(
  ("a an the is are was were be been will would do does did to of in on for and or what who whom which how why " +
    "when it this that these those we i you they he she about with at by from any there their our us me my can " +
    "could should have has had say said tell meeting team please also s date deadline due day time").split(" "),
);
const SYNONYMS: Record<string, string> = {
  price: "price", pricing: "price", cost: "price", free: "price", paid: "price", charge: "price",
  bug: "bug", issue: "bug", defect: "bug", problem: "bug",
  release: "launch", ship: "launch", launch: "launch",
  iphone: "ios", apple: "ios", mail: "email", user: "user", customer: "user",
  screenshot: "screenshot", store: "store", playstore: "store",
};

const english = (segment: Segment) => segment.text.en ?? "";
const sentences = (text: string) =>
  text.trim().split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const capitalize = (text: string) => (text.trim() ? text.trim()[0].toUpperCase() + text.trim().slice(1) : "");
const lowerFirst = (text: string) => (text ? text[0].toLowerCase() + text.slice(1) : text);
const cleanClause = (text: string) => capitalize(text.trim().replace(/[.!;,\s]+$/, ""));
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function speakerLookup(speakers: Speaker[]): Map<string, Speaker> {
  return new Map(speakers.map((s) => [s.id, s]));
}

export function extractDecisions(segments: Segment[]): Decision[] {
  const decisions: Decision[] = [];
  segments.forEach((segment, index) => {
    const parts = sentences(english(segment));
    for (let position = 0; position < parts.length; position++) {
      const sentence = parts[position];
      if (sentence.endsWith("?") || !DECISION.test(sentence)) continue;
      let content: string;
      const colon = sentence.indexOf(":");
      if (colon >= 0 && DECISION.test(sentence.slice(0, colon))) {
        content = sentence.slice(colon + 1);
      } else {
        content = sentence.replace(DECISION, "").replace(LEADING_FILLER, "").replace(/^[\s,.]+|[\s,.]+$/g, "");
        if (wordCount(content) < 3) content = parts.slice(position + 1).join(" ");
      }
      if (wordCount(content) < 3) continue;
      const sources = [segment.id];
      const previous = index > 0 ? segments[index - 1] : undefined;
      if (previous && english(previous).trimEnd().endsWith("?")) sources.unshift(previous.id);
      decisions.push({ text: `${cleanClause(content)}.`, source_segment_ids: sources });
      break;
    }
  });
  return decisions;
}

export function extractActionItems(segments: Segment[], speakers: Map<string, Speaker>): ActionItem[] {
  const items: ActionItem[] = [];
  for (const segment of segments) {
    for (const raw of sentences(english(segment))) {
      const sentence = raw.replace(LEADING_FILLER, "");
      let owner: string | null = null;
      let match = sentence.match(COMMITMENT);
      if (match) owner = speakers.get(segment.speaker_id)?.name ?? null;
      else match = sentence.match(DELEGATION);
      if (!match) continue;
      let task = match[1];
      let deadline: string | null = null;
      const deadlineMatch = task.match(DEADLINE);
      if (deadlineMatch && deadlineMatch.index !== undefined) {
        deadline = capitalize(deadlineMatch[1]);
        task = task.slice(0, deadlineMatch.index) + task.slice(deadlineMatch.index + deadlineMatch[0].length);
      }
      items.push({
        id: `a${items.length + 1}`,
        task: cleanClause(task),
        owner,
        deadline,
        status: "pending",
        source_segment_ids: [segment.id],
      });
    }
  }
  return items;
}

export function extractOpenQuestions(segments: Segment[]): OpenQuestion[] {
  const questions: OpenQuestion[] = [];
  segments.forEach((segment, index) => {
    const asked = sentences(english(segment)).filter((s) => s.endsWith("?"));
    if (!asked.length) return;
    const replies = segments.slice(index + 1, index + 3).filter((s) => s.speaker_id !== segment.speaker_id);
    const unresolved = replies.find((r) => UNRESOLVED.test(english(r)));
    if (replies.length && !unresolved) return;
    const last = asked[asked.length - 1];
    const text = last.includes(":") ? last.slice(last.indexOf(":") + 1) : last;
    questions.push({
      text: capitalize(text),
      source_segment_ids: unresolved ? [segment.id, unresolved.id] : [segment.id],
    });
  });
  return questions;
}

function buildSummary(meeting: Meeting, decisions: Decision[], items: ActionItem[], questions: OpenQuestion[]) {
  const speakers = speakerLookup(meeting.speakers);
  const spoken = [...new Set(meeting.segments.map((s) => s.speaker_id))];
  const names = spoken.map((id) => speakers.get(id)?.name.split(" ")[0]).filter((n): n is string => Boolean(n));
  const languages = [...new Set(meeting.segments.map((s) => LANGUAGE_NAMES[s.original_language]))];

  const parts = [`${joinNames(names)} discussed the ${meeting.title} in ${joinNames(languages)}.`];
  parts.push(
    decisions.length
      ? `Decisions: ${decisions.map((d) => lowerFirst(d.text.replace(/\.$/, ""))).join("; ")}.`
      : "No explicit decisions were recorded.",
  );
  if (items.length) {
    const unassigned = items.filter((i) => i.owner === null).length;
    parts.push(
      `${items.length} action item${items.length === 1 ? "" : "s"} captured${unassigned ? ` (${unassigned} without an owner)` : ""}.`,
    );
  }
  if (questions.length) parts.push(`Still open: ${questions.map((q) => lowerFirst(q.text)).join(" ")}`);
  return parts.join(" ");
}

export function analyzeLocally(meeting: Meeting): AnalysisResult {
  const decisions = extractDecisions(meeting.segments);
  const actionItems = extractActionItems(meeting.segments, speakerLookup(meeting.speakers));
  const openQuestions = extractOpenQuestions(meeting.segments);
  return {
    summary: buildSummary(meeting, decisions, actionItems, openQuestions),
    decisions,
    action_items: actionItems,
    open_questions: openQuestions,
    mode: "rules",
  };
}

// --- Question answering ------------------------------------------------------

function stem(input: string): string {
  let word = input.replace(/'s$/, "");
  if (SYNONYMS[word]) return SYNONYMS[word];
  for (const [suffix, minimum] of [["ing", 6], ["ed", 5], ["es", 5], ["s", 4]] as const) {
    if (word.endsWith(suffix) && word.length >= minimum) {
      word = word.slice(0, -suffix.length);
      break;
    }
  }
  return SYNONYMS[word] ?? word;
}

function tokens(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w) && w.length > 1).map(stem));
}

function quote(segment: Segment, speakers: Map<string, Speaker>): string {
  const name = speakers.get(segment.speaker_id)?.name ?? "A participant";
  return `${name} (${formatTimestamp(segment.start_seconds)}): “${english(segment)}”`;
}

const describeItem = (item: ActionItem) =>
  `${item.task} (${item.owner ?? "No owner assigned"}${item.deadline ? `, due ${item.deadline}` : ", no deadline stated"})`;

const answerOf = (answer: string, grounded: boolean, ids: string[] = []): AnswerResult => ({
  answer,
  grounded,
  source_segment_ids: ids,
  mode: "rules",
});

export function answerLocally(meeting: Meeting, question: string): AnswerResult {
  const speakers = speakerLookup(meeting.speakers);
  const analysis = analyzeLocally(meeting);

  if (INTENT_SUMMARY.test(question)) return answerOf(analysis.summary, true, meeting.segments.slice(0, 1).map((s) => s.id));
  if (INTENT_OPEN.test(question)) {
    if (!analysis.open_questions.length) return answerOf("No unresolved questions were found in the transcript.", true);
    return answerOf(
      `Unresolved: ${analysis.open_questions.map((q) => q.text).join(" ")}`,
      true,
      analysis.open_questions.flatMap((q) => q.source_segment_ids),
    );
  }
  if (INTENT_ACTIONS.test(question)) {
    if (!analysis.action_items.length) return answerOf("No action items were stated in the meeting.", true);
    return answerOf(
      `${analysis.action_items.length} action items: ${analysis.action_items.map(describeItem).join("; ")}.`,
      true,
      analysis.action_items.flatMap((i) => i.source_segment_ids),
    );
  }
  if (INTENT_DECISIONS.test(question) && !INTENT_TEMPORAL.test(question)) {
    if (!analysis.decisions.length) return answerOf("No explicit decisions were recorded in the meeting.", true);
    return answerOf(
      `Decisions: ${analysis.decisions.map((d) => d.text).join(" ")}`,
      true,
      analysis.decisions.flatMap((d) => d.source_segment_ids),
    );
  }

  const questionTokens = tokens(question);
  if (!questionTokens.size) {
    const englishOnly = /[a-zA-Z]/.test(question)
      ? ""
      : " The offline assistant only understands English questions; configure Gemini for Bengali or Hindi questions.";
    return answerOf(NOT_ENOUGH_INFO + englishOnly, false);
  }

  const documents = new Map(
    meeting.segments.map((s) => [s.id, tokens(`${english(s)} ${speakers.get(s.speaker_id)?.name ?? ""}`)]),
  );
  const total = documents.size;
  const frequency = new Map(
    [...questionTokens].map((t) => [t, [...documents.values()].filter((d) => d.has(t)).length]),
  );
  const score = (id: string) =>
    [...questionTokens].reduce((sum, t) => {
      const df = frequency.get(t) ?? 0;
      return documents.get(id)?.has(t) && df ? sum + Math.log(total / df) + 0.1 : sum;
    }, 0);
  const scores = new Map(meeting.segments.map((s) => [s.id, score(s.id)]));
  const ranked = meeting.segments
    .filter((s) => (scores.get(s.id) ?? 0) >= 1)
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
  if (!ranked.length) return answerOf(NOT_ENOUGH_INFO, false);

  const best = scores.get(ranked[0].id) ?? 0;
  let top = ranked.filter((s) => (scores.get(s.id) ?? 0) >= best * 0.6).slice(0, 2);

  if (INTENT_TEMPORAL.test(question)) {
    const timed = top.filter((s) => TIME_EXPRESSION.test(english(s)));
    if (!timed.length) {
      return answerOf(
        `${NOT_ENOUGH_INFO} No date or time is stated for this. Closest related discussion: ${quote(top[0], speakers)}`,
        false,
        [top[0].id],
      );
    }
    top = timed;
  }

  const openIds = new Set(analysis.open_questions.flatMap((q) => q.source_segment_ids));
  if (top.some((s) => openIds.has(s.id))) {
    const related = meeting.segments.filter((s) => openIds.has(s.id));
    return answerOf(
      `This was raised but not resolved in the meeting. ${related.map((s) => quote(s, speakers)).join(" ")}`,
      true,
      related.map((s) => s.id),
    );
  }

  const ordered = [...top].sort((a, b) => a.start_seconds - b.start_seconds);
  return answerOf(
    `From the transcript: ${ordered.map((s) => quote(s, speakers)).join(" ")}`,
    true,
    ordered.map((s) => s.id),
  );
}
