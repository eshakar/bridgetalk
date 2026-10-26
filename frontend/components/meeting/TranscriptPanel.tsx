"use client";

import { useEffect, useMemo } from "react";
import { FileText, Info } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { TranscriptSegment } from "@/components/meeting/TranscriptSegment";
import { CopyButton } from "@/components/ui/CopyButton";
import { Panel } from "@/components/ui/primitives";
import { cn, formatTimestamp, speakerMap, speakerTone } from "@/lib/utils";
import type { TranscriptView } from "@/types/meeting";

const VIEWS: { value: TranscriptView; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "translated", label: "Translated" },
  { value: "both", label: "Both" },
];

export function TranscriptPanel() {
  const { meeting, displayLanguage, transcriptView, setTranscriptView, highlightedSegmentId } = useMeeting();
  const speakers = useMemo(() => speakerMap(meeting), [meeting]);
  const languages = useMemo(() => new Map(meeting.languages.map((l) => [l.code, l])), [meeting]);
  const target = languages.get(displayLanguage);
  const translatedCount = meeting.segments.filter((s) => s.original_language !== displayLanguage && s.text[displayLanguage]).length;

  useEffect(() => {
    if (!highlightedSegmentId) return;
    document.getElementById(`segment-${highlightedSegmentId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedSegmentId]);

  const copyTranscript = () =>
    meeting.segments
      .map((segment) => {
        const name = speakers.get(segment.speaker_id)?.name ?? "Unknown";
        const text =
          transcriptView === "original"
            ? segment.text[segment.original_language]
            : (segment.text[displayLanguage] ?? segment.text[segment.original_language]);
        return `[${formatTimestamp(segment.start_seconds)}] ${name}: ${text}`;
      })
      .join("\n");

  return (
    <Panel
      title="Transcript"
      icon={FileText}
      description={`${meeting.segments.length} segments · ${translatedCount} translated to ${target?.label ?? displayLanguage}`}
      actions={<CopyButton getText={copyTranscript} label="Copy transcript" successMessage="Transcript copied" />}
      bodyClassName="p-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/70 px-5 py-2.5">
        <div role="radiogroup" aria-label="Transcript view" className="inline-flex rounded-lg bg-ink-900 p-0.5 ring-1 ring-ink-700">
          {VIEWS.map((view) => {
            const active = transcriptView === view.value;
            return (
              <button
                key={view.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTranscriptView(view.value)}
                className={cn(
                  "focus-ring rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  active ? "bg-ink-700 text-ink-50 shadow-sm" : "text-ink-400 hover:text-ink-200",
                )}
              >
                {view.label}
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
          <Info className="size-3" aria-hidden />
          {meeting.is_simulated ? "Simulated, hand-written transcript" : meeting.languages.length > 1 ? "Translated by Gemini" : "Entered by you"}
        </p>
      </div>

      <ol data-lenis-prevent className="scroll-panel max-h-[620px] space-y-0.5 overflow-y-auto overscroll-contain p-2" aria-label="Transcript segments">
        {meeting.segments.map((segment) => (
          <TranscriptSegment
            key={segment.id}
            segment={segment}
            speaker={speakers.get(segment.speaker_id)}
            tone={speakerTone(meeting, segment.speaker_id)}
            view={transcriptView}
            displayLanguage={displayLanguage}
            languages={languages}
            highlighted={highlightedSegmentId === segment.id}
          />
        ))}
      </ol>
    </Panel>
  );
}
