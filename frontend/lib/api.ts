// Typed client for the BridgeTalk FastAPI backend.
// Reads fall back to the built-in sample and in-browser rules engine when the API
// is unreachable, and every result says whether it was saved to MongoDB, so the UI
// never claims a write that did not happen.

import type {
  ActionItem,
  AnalysisResult,
  AnswerResult,
  HealthStatus,
  Meeting,
  MeetingCreate,
  MeetingDetail,
  MeetingSummary,
  ResultOrigin,
} from "@/types/meeting";
import { analyzeLocally, answerLocally } from "@/lib/local-intelligence";
import { SAMPLE_MEETING } from "@/lib/sample-meeting";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const TIMEOUT_MS = 25_000;
// Analysis and Q&A may walk through several Gemini models when one is overloaded.
const AI_TIMEOUT_MS = 90_000;

export interface Sourced<T> {
  data: T;
  origin: ResultOrigin;
  /** Set when the backend was tried and failed, explaining the fallback. */
  fallbackReason?: string;
}

class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message = isObject(body) && typeof body.message === "string" ? body.message : `The API responded with ${response.status}.`;
      throw new ApiError(message);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError("The API timed out.");
    throw new ApiError("The API is unreachable.");
  } finally {
    clearTimeout(timer);
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function isAnalysis(value: unknown): value is AnalysisResult {
  return (
    isObject(value) &&
    typeof value.summary === "string" &&
    Array.isArray(value.decisions) &&
    Array.isArray(value.action_items)
  );
}

function isAnswer(value: unknown): value is AnswerResult {
  return isObject(value) && typeof value.answer === "string" && typeof value.grounded === "boolean";
}

function isMeetingDetail(value: unknown): value is MeetingDetail {
  return isObject(value) && typeof value.title === "string" && Array.isArray(value.segments) && value.segments.length > 0;
}

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : "The API request failed.");

/** Stored meetings are referenced by ID; the built-in sample is sent inline (stateless, not saved). */
function meetingReference(meeting: Meeting, persisted: boolean) {
  return persisted
    ? { meeting_id: meeting.id }
    : { title: meeting.title, speakers: meeting.speakers, segments: meeting.segments };
}

export const LOCAL_DEMO: MeetingDetail = { ...SAMPLE_MEETING, persisted: false, insights: null, questions: [] };

function normalizeDetail(detail: MeetingDetail): MeetingDetail {
  return { ...detail, persisted: Boolean(detail.persisted), insights: detail.insights ?? null, questions: detail.questions ?? [] };
}

export async function fetchHealth(): Promise<HealthStatus | null> {
  try {
    return await request<HealthStatus>("/health", undefined, 6_000);
  } catch {
    return null;
  }
}

async function loadDemo(path: string, init?: RequestInit): Promise<Sourced<MeetingDetail>> {
  try {
    const data = await request<unknown>(path, init, 8_000);
    if (!isMeetingDetail(data)) throw new ApiError("The API returned an unexpected meeting format.");
    return { data: normalizeDetail(data), origin: "backend" };
  } catch (error) {
    return { data: LOCAL_DEMO, origin: "local", fallbackReason: reasonOf(error) };
  }
}

export const fetchDemoMeeting = () => loadDemo("/api/meetings/demo");

/** Clears saved insights and questions for the demo meeting (transcript is kept). */
export const resetDemoMeeting = () => loadDemo("/api/meetings/demo/reset", { method: "POST" });

/** All meetings stored in MongoDB, newest first. Null when the API or database is unavailable. */
export async function fetchMeetings(): Promise<MeetingSummary[] | null> {
  try {
    const data = await request<unknown>("/api/meetings", undefined, 8_000);
    return Array.isArray(data) ? (data as MeetingSummary[]) : null;
  } catch {
    return null;
  }
}

export async function fetchMeeting(id: string): Promise<MeetingDetail | null> {
  try {
    const data = await request<unknown>(`/api/meetings/${encodeURIComponent(id)}`, undefined, 8_000);
    return isMeetingDetail(data) ? normalizeDetail(data) : null;
  } catch {
    return null;
  }
}

/** Creating needs the database: there is no offline fallback, so failures are reported. */
export async function createMeeting(body: MeetingCreate): Promise<{ ok: true; data: MeetingDetail } | { ok: false; reason: string }> {
  try {
    // Translation runs on the server, so allow extra time for long transcripts.
    const data = await request<unknown>("/api/meetings", { method: "POST", body: JSON.stringify(body) }, 120_000);
    if (!isMeetingDetail(data)) throw new ApiError("The API returned an unexpected meeting format.");
    return { ok: true, data: normalizeDetail(data) };
  } catch (error) {
    return { ok: false, reason: reasonOf(error) };
  }
}

export async function resetStoredMeeting(id: string): Promise<MeetingDetail | null> {
  try {
    const data = await request<unknown>(`/api/meetings/${encodeURIComponent(id)}/reset`, { method: "POST" }, 8_000);
    return isMeetingDetail(data) ? normalizeDetail(data) : null;
  } catch {
    return null;
  }
}

export async function deleteMeeting(id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const response = await fetch(`${API_URL}/api/meetings/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new ApiError(`The API responded with ${response.status}.`);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof ApiError ? error.message : "The API is unreachable." };
  }
}

export async function analyzeMeeting(meeting: Meeting, persisted: boolean): Promise<Sourced<AnalysisResult>> {
  try {
    const data = await request<unknown>("/api/meetings/analyze", {
      method: "POST",
      body: JSON.stringify(meetingReference(meeting, persisted)),
    }, AI_TIMEOUT_MS);
    if (!isAnalysis(data)) throw new ApiError("The API returned an unexpected analysis format.");
    return { data: { ...data, open_questions: data.open_questions ?? [], persisted: Boolean(data.persisted) }, origin: "backend" };
  } catch (error) {
    return { data: { ...analyzeLocally(meeting), persisted: false }, origin: "local", fallbackReason: reasonOf(error) };
  }
}

export async function askMeeting(meeting: Meeting, persisted: boolean, question: string): Promise<Sourced<AnswerResult>> {
  try {
    const data = await request<unknown>("/api/meetings/ask", {
      method: "POST",
      body: JSON.stringify({ ...meetingReference(meeting, persisted), question }),
    }, AI_TIMEOUT_MS);
    if (!isAnswer(data)) throw new ApiError("The API returned an unexpected answer format.");
    return {
      data: { ...data, source_segment_ids: data.source_segment_ids ?? [], persisted: Boolean(data.persisted) },
      origin: "backend",
    };
  } catch (error) {
    return { data: { ...answerLocally(meeting, question), persisted: false }, origin: "local", fallbackReason: reasonOf(error) };
  }
}

/** Persist an action-item status. No local fallback: a failed save is reported, never faked. */
export async function updateActionItemStatus(
  meetingId: string,
  actionItemId: string,
  status: ActionItem["status"],
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await request<ActionItem>(
      `/api/meetings/${encodeURIComponent(meetingId)}/action-items/${encodeURIComponent(actionItemId)}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      8_000,
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: reasonOf(error) };
  }
}
