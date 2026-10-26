"use client";

import type { ReactNode } from "react";
import { Database, RefreshCw, RotateCcw, Server, SlidersHorizontal } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { LanguageSelector } from "@/components/meeting/LanguageSelector";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TranscriptView } from "@/types/meeting";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-ink-300">{label}</span>
      <div className="flex items-center gap-2 text-sm text-ink-100">{children}</div>
    </div>
  );
}

export function SettingsPanels() {
  const { apiStatus, health, checkApi, transcriptView, setTranscriptView, resetMeeting, storageMode } = useMeeting();

  return (
    <div className="space-y-6">
      <Panel
        title="Backend connection"
        icon={Server}
        actions={
          <Button size="sm" icon={RefreshCw} onClick={() => void checkApi()} disabled={apiStatus === "checking"}>
            Re-check
          </Button>
        }
      >
        <div className="divide-y divide-ink-700/60">
          <Row label="API URL">
            <code className="rounded bg-ink-900 px-2 py-0.5 font-mono text-xs text-ink-200">{API_URL || "Same origin (/api)"}</code>
          </Row>
          <Row label="Status">
            {apiStatus === "checking" ? (
              <Badge>Checking…</Badge>
            ) : apiStatus === "online" ? (
              <Badge tone="green">Connected · v{health?.version}</Badge>
            ) : (
              <Badge tone="amber">Unreachable · offline mode</Badge>
            )}
          </Row>
          <Row label="Database">
            {health?.database === "connected" ? (
              <Badge tone="green">MongoDB connected</Badge>
            ) : (
              <Badge tone="amber">Unavailable · changes not saved</Badge>
            )}
          </Row>
          <Row label="This meeting">
            {storageMode === "mongodb" ? <Badge>Stored in MongoDB</Badge> : <Badge tone="amber">Built-in sample (demo mode)</Badge>}
          </Row>
          <Row label="AI analysis">
            {health?.ai_configured ? (
              <Badge tone="violet">Google Gemini · {health.ai_model}</Badge>
            ) : (
              <Badge tone="blue">Deterministic rules engine</Badge>
            )}
          </Row>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          Set <code className="font-mono text-ink-300">GEMINI_API_KEY</code> in <code className="font-mono text-ink-300">backend/.env</code> to
          enable model-based analysis. The key stays on the server and is never sent to the browser.
        </p>
      </Panel>

      <Panel title="Display" icon={SlidersHorizontal}>
        <div className="divide-y divide-ink-700/60">
          <Row label="Transcript language">
            <LanguageSelector id="settings-language" />
          </Row>
          <Row label="Default transcript view">
            <div role="radiogroup" aria-label="Default transcript view" className="inline-flex rounded-lg bg-ink-900 p-0.5 ring-1 ring-ink-700">
              {(["original", "translated", "both"] as TranscriptView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  role="radio"
                  aria-checked={transcriptView === view}
                  onClick={() => setTranscriptView(view)}
                  className={cn(
                    "focus-ring rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    transcriptView === view ? "bg-ink-700 text-ink-50" : "text-ink-400 hover:text-ink-200",
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          </Row>
        </div>
      </Panel>

      <Panel title="Sample data" icon={Database}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-sm text-ink-400">
            Restore the simulated meeting and clear the analysis, completed items and questions (also in MongoDB when
            connected; the transcript is kept).
          </p>
          <Button icon={RotateCcw} onClick={() => void resetMeeting()}>
            Reset sample meeting
          </Button>
        </div>
      </Panel>
    </div>
  );
}
