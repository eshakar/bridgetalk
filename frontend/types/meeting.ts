// Shared domain types. These mirror backend/app/schemas.py.

export type LanguageCode = "en" | "bn" | "hi";

export interface Language {
  code: LanguageCode;
  label: string;
  native_label: string;
}

export interface Speaker {
  id: string;
  name: string;
  role: string;
  primary_language: LanguageCode;
}

export interface Segment {
  id: string;
  speaker_id: string;
  start_seconds: number;
  end_seconds: number;
  original_language: LanguageCode;
  /** Text keyed by language. English is the pivot language used for analysis. */
  text: Partial<Record<LanguageCode, string>>;
}

export interface Meeting {
  id: string;
  title: string;
  status: "scheduled" | "live" | "completed";
  date: string;
  duration_seconds: number;
  is_simulated: boolean;
  source_note: string;
  languages: Language[];
  speakers: Speaker[];
  segments: Segment[];
  description?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Decision {
  text: string;
  source_segment_ids: string[];
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string | null;
  deadline: string | null;
  status: "pending" | "done";
  source_segment_ids: string[];
}

export interface OpenQuestion {
  text: string;
  source_segment_ids: string[];
}

/** "gemini" = live Google Gemini model; "rules" = deterministic engine (backend or in-browser). */
export type AnalysisMode = "gemini" | "rules";

export interface AnalysisResult {
  summary: string;
  decisions: Decision[];
  action_items: ActionItem[];
  open_questions: OpenQuestion[];
  mode: AnalysisMode;
  /** True only when the backend saved this result to MongoDB. */
  persisted?: boolean;
}

export interface AnswerResult {
  answer: string;
  grounded: boolean;
  source_segment_ids: string[];
  mode: AnalysisMode;
  persisted?: boolean;
}

export interface StoredQuestion {
  id: string;
  question: string;
  answer: string;
  grounded: boolean;
  source_segment_ids: string[];
  mode: AnalysisMode;
  created_at: string | null;
}

/** A meeting plus its saved insights and Q&A history. `persisted` is false for the built-in sample. */
export interface MeetingDetail extends Meeting {
  persisted: boolean;
  insights: AnalysisResult | null;
  questions: StoredQuestion[];
}

export interface HealthStatus {
  status: "ok" | "degraded";
  version: string;
  ai_configured: boolean;
  ai_model: string | null;
  database: "connected" | "unavailable";
}

/** Where a result came from: the FastAPI backend or the in-browser fallback. */
export type ResultOrigin = "backend" | "local";

export type TranscriptView = "original" | "translated" | "both";

export interface MeetingSummary {
  id: string;
  title: string;
  description: string;
  status: Meeting["status"];
  date: string;
  duration_seconds: number;
  languages: Language[];
  speaker_count: number;
  is_simulated: boolean;
  /** The seeded sample meeting: it can be reset but not deleted. */
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Body of POST /api/meetings: a meeting entered by the user. */
export interface MeetingCreate {
  title: string;
  description?: string;
  date?: string;
  participants: { name: string; role: string; primary_language: LanguageCode }[];
  /** `speaker` is an index into `participants`. */
  lines: { speaker: number; language: LanguageCode; text: string }[];
  translate: boolean;
}
