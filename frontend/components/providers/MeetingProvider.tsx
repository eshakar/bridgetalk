"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  analyzeMeeting,
  askMeeting,
  createMeeting as apiCreateMeeting,
  deleteMeeting as apiDeleteMeeting,
  fetchDemoMeeting,
  fetchHealth,
  fetchMeeting,
  fetchMeetings,
  LOCAL_DEMO,
  resetDemoMeeting,
  resetStoredMeeting,
  updateActionItemStatus,
  type Sourced,
} from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import type {
  AnalysisResult,
  AnswerResult,
  HealthStatus,
  LanguageCode,
  Meeting,
  MeetingCreate,
  MeetingDetail,
  MeetingSummary,
  ResultOrigin,
  TranscriptView,
} from "@/types/meeting";

export type ApiStatus = "checking" | "online" | "offline";
export type AnalysisStatus = "idle" | "loading" | "ready";
/** "mongodb": the meeting and its changes are saved. "demo": local sample, nothing is saved. */
export type StorageMode = "mongodb" | "demo";

export interface QAEntry {
  id: number;
  question: string;
  status: "loading" | "done";
  result?: AnswerResult;
  origin?: ResultOrigin;
}

interface MeetingContextValue {
  meeting: Meeting;
  /** True for the seeded sample (or the built-in copy of it in demo mode). */
  isDemo: boolean;
  /** Stored meetings, or null when the database is unavailable. */
  meetings: MeetingSummary[] | null;
  refreshMeetings: () => Promise<void>;
  openMeeting: (id: string) => Promise<boolean>;
  createMeeting: (body: MeetingCreate) => Promise<{ ok: true; id: string } | { ok: false; reason: string }>;
  removeMeeting: (id: string) => Promise<boolean>;
  switching: boolean;
  storageMode: StorageMode;
  displayLanguage: LanguageCode;
  setDisplayLanguage: (language: LanguageCode) => void;
  transcriptView: TranscriptView;
  setTranscriptView: (view: TranscriptView) => void;
  analysis: AnalysisResult | null;
  analysisStatus: AnalysisStatus;
  analysisOrigin: ResultOrigin | null;
  runAnalysis: () => Promise<void>;
  completedItems: Record<string, boolean>;
  toggleItem: (id: string) => void;
  qaEntries: QAEntry[];
  ask: (question: string) => Promise<void>;
  clearQuestions: () => void;
  highlightedSegmentId: string | null;
  focusSegment: (id: string) => void;
  resetMeeting: () => Promise<void>;
  apiStatus: ApiStatus;
  health: HealthStatus | null;
  checkApi: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextValue | null>(null);

/** Keep loading states visible long enough to read, even on a fast local API. */
const MIN_LOADING_MS = 650;
const settle = <T,>(promise: Promise<T>) =>
  Promise.all([promise, new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS))]).then(([value]) => value);

/** Remembers which meeting was open, per browser. Purely a convenience: failures are ignored. */
const SELECTED_KEY = "bridgetalk.selected-meeting";
function rememberMeeting(id: string | null) {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id);
    else localStorage.removeItem(SELECTED_KEY);
  } catch {}
}
function rememberedMeeting(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

const statusMap = (analysis: AnalysisResult | null) =>
  Object.fromEntries((analysis?.action_items ?? []).map((item) => [item.id, item.status === "done"]));

export function MeetingProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [meeting, setMeeting] = useState<Meeting>(LOCAL_DEMO);
  const [persisted, setPersisted] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState<LanguageCode>("en");
  const [transcriptView, setTranscriptView] = useState<TranscriptView>("both");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisOrigin, setAnalysisOrigin] = useState<ResultOrigin | null>(null);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [qaEntries, setQaEntries] = useState<QAEntry[]>([]);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[] | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const nextQuestionId = useRef(1);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on reset so in-flight requests from the previous session are ignored.
  const session = useRef(0);

  /** Replace all meeting state with a loaded meeting, including saved insights and Q&A. */
  const hydrate = useCallback((result: Sourced<MeetingDetail>) => {
    const detail = result.data;
    // Ignore answers still in flight for the previously open meeting.
    session.current += 1;
    setMeeting(detail);
    setDisplayLanguage((current) =>
      detail.languages.some((language) => language.code === current) ? current : (detail.languages[0]?.code ?? "en"),
    );
    setPersisted(detail.persisted);
    setAnalysis(detail.insights);
    setAnalysisStatus(detail.insights ? "ready" : "idle");
    setAnalysisOrigin(detail.insights ? "backend" : null);
    setCompletedItems(statusMap(detail.insights));
    setQaEntries(
      detail.questions.map((q) => ({
        id: nextQuestionId.current++,
        question: q.question,
        status: "done",
        origin: "backend",
        result: { answer: q.answer, grounded: q.grounded, source_segment_ids: q.source_segment_ids, mode: q.mode, persisted: true },
      })),
    );
    setApiStatus(result.origin === "backend" ? "online" : "offline");
  }, []);

  const checkApi = useCallback(async () => {
    setApiStatus("checking");
    const result = await fetchHealth();
    setHealth(result);
    setApiStatus(result ? "online" : "offline");
  }, []);

  const refreshMeetings = useCallback(async () => {
    setMeetings(await fetchMeetings());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remembered = rememberedMeeting();
      const [healthResult, demo, list, selected] = await Promise.all([
        fetchHealth(),
        fetchDemoMeeting(),
        fetchMeetings(),
        remembered ? fetchMeeting(remembered) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setHealth(healthResult);
      setMeetings(list);
      if (demo.data.persisted) setDemoId(demo.data.id);
      if (selected) {
        hydrate({ data: selected, origin: "backend" });
      } else {
        if (remembered) rememberMeeting(null);
        hydrate(demo);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const openMeeting = useCallback(
    async (id: string) => {
      if (id === meeting.id) return true;
      setSwitching(true);
      const detail = id === demoId ? (await fetchDemoMeeting()).data : await fetchMeeting(id);
      setSwitching(false);
      if (!detail) {
        notify("Couldn't open that meeting", { tone: "warning", description: "The API or database is unavailable." });
        return false;
      }
      hydrate({ data: detail, origin: "backend" });
      rememberMeeting(id === demoId ? null : id);
      return true;
    },
    [meeting.id, demoId, hydrate, notify],
  );

  const createMeeting = useCallback<MeetingContextValue["createMeeting"]>(
    async (body) => {
      const result = await apiCreateMeeting(body);
      if (!result.ok) return result;
      hydrate({ data: result.data, origin: "backend" });
      rememberMeeting(result.data.id);
      void refreshMeetings();
      const translated = result.data.languages.length > 1;
      notify("Meeting saved to MongoDB", {
        description: `${result.data.segments.length} lines${translated ? ", translated by Gemini" : ""}. Generate intelligence when ready.`,
      });
      return { ok: true, id: result.data.id };
    },
    [hydrate, notify, refreshMeetings],
  );

  const removeMeeting = useCallback(
    async (id: string) => {
      const result = await apiDeleteMeeting(id);
      if (!result.ok) {
        notify("Meeting not deleted", { tone: "warning", description: result.reason });
        return false;
      }
      setMeetings((current) => current?.filter((m) => m.id !== id) ?? current);
      if (id === meeting.id) {
        rememberMeeting(null);
        hydrate(await fetchDemoMeeting());
      }
      notify("Meeting deleted", { tone: "info", description: "Its transcript, insights and questions were removed." });
      return true;
    },
    [meeting.id, hydrate, notify],
  );

  const runAnalysis = useCallback(async () => {
    const current = session.current;
    setAnalysisStatus("loading");
    const result = await settle(analyzeMeeting(meeting, persisted));
    if (current !== session.current) return;
    setAnalysis(result.data);
    setAnalysisOrigin(result.origin);
    setAnalysisStatus("ready");
    setCompletedItems(statusMap(result.data));
    const counts = `${result.data.decisions.length} decisions and ${result.data.action_items.length} action items extracted.`;
    if (result.origin === "local") {
      setApiStatus("offline");
      notify("Analysed offline, not saved", {
        tone: "warning",
        description: `${result.fallbackReason ?? "Backend unavailable."} Used the in-browser rules engine instead.`,
      });
    } else {
      setApiStatus("online");
      notify(result.data.persisted ? "Insights saved to MongoDB" : "Meeting intelligence ready", {
        description: result.data.persisted ? counts : `${counts} Demo mode: not saved.`,
      });
    }
  }, [meeting, persisted, notify]);

  const toggleItem = useCallback(
    (id: string) => {
      const next = !completedItems[id];
      setCompletedItems((current) => ({ ...current, [id]: next }));
      if (!persisted || !analysis?.persisted) return;
      void updateActionItemStatus(meeting.id, id, next ? "done" : "pending").then((saved) => {
        if (saved.ok) return;
        // Roll back: the change was not stored.
        setCompletedItems((current) => ({ ...current, [id]: !next }));
        notify("Status not saved", { tone: "warning", description: saved.reason });
      });
    },
    [completedItems, persisted, analysis, meeting.id, notify],
  );

  const ask = useCallback(
    async (question: string) => {
      const current = session.current;
      const id = nextQuestionId.current++;
      setQaEntries((entries) => [...entries, { id, question, status: "loading" }]);
      const result = await settle(askMeeting(meeting, persisted, question));
      if (current !== session.current) return;
      setQaEntries((entries) =>
        entries.map((entry) => (entry.id === id ? { ...entry, status: "done", result: result.data, origin: result.origin } : entry)),
      );
      if (result.origin === "local") {
        setApiStatus("offline");
        notify("Answered offline, not saved", { tone: "warning", description: result.fallbackReason });
      }
    },
    [meeting, persisted, notify],
  );

  // Clears the visible history only; saved questions remain in MongoDB until a reset.
  const clearQuestions = useCallback(() => setQaEntries([]), []);

  const focusSegment = useCallback((id: string) => {
    setHighlightedSegmentId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedSegmentId(null), 2400);
  }, []);

  const isDemo = !persisted || meeting.id === demoId;

  const resetMeeting = useCallback(async () => {
    session.current += 1;
    setTranscriptView("both");
    if (!isDemo) {
      const detail = await resetStoredMeeting(meeting.id);
      if (detail) {
        hydrate({ data: detail, origin: "backend" });
        notify("Insights cleared", { tone: "info", description: "Saved insights and questions were removed. The transcript is kept." });
      } else {
        notify("Nothing was reset", { tone: "warning", description: "The API or database is unavailable." });
      }
      return;
    }
    setDisplayLanguage("en");
    const result = await resetDemoMeeting();
    hydrate(result);
    const saved = result.origin === "backend" && result.data.persisted;
    notify("Sample meeting restored", {
      tone: saved ? "success" : "info",
      description: saved
        ? "Saved insights and questions were cleared in MongoDB."
        : result.origin === "backend"
          ? "Database unavailable: loaded the built-in sample (demo mode)."
          : "API offline: loaded the built-in sample (demo mode).",
    });
  }, [isDemo, meeting.id, hydrate, notify]);

  const storageMode: StorageMode = persisted && apiStatus !== "offline" ? "mongodb" : "demo";

  const value = useMemo<MeetingContextValue>(
    () => ({
      meeting,
      isDemo,
      meetings,
      refreshMeetings,
      openMeeting,
      createMeeting,
      removeMeeting,
      switching,
      storageMode,
      displayLanguage,
      setDisplayLanguage,
      transcriptView,
      setTranscriptView,
      analysis,
      analysisStatus,
      analysisOrigin,
      runAnalysis,
      completedItems,
      toggleItem,
      qaEntries,
      ask,
      clearQuestions,
      highlightedSegmentId,
      focusSegment,
      resetMeeting,
      apiStatus,
      health,
      checkApi,
    }),
    [
      meeting, isDemo, meetings, refreshMeetings, openMeeting, createMeeting, removeMeeting, switching, storageMode, displayLanguage, transcriptView, analysis, analysisStatus, analysisOrigin, runAnalysis,
      completedItems, toggleItem, qaEntries, ask, clearQuestions, highlightedSegmentId, focusSegment, resetMeeting,
      apiStatus, health, checkApi,
    ],
  );

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
}

export function useMeeting(): MeetingContextValue {
  const context = useContext(MeetingContext);
  if (!context) throw new Error("useMeeting must be used inside MeetingProvider");
  return context;
}
