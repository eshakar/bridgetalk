"use client";

import { HelpCircle, ScrollText, Sparkles } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { AnalysisOriginBadge, GenerateButton } from "@/components/intelligence/AnalysisControls";
import { AiThinking, StreamText } from "@/components/effects/AiThinking";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState, Panel, SkeletonLines } from "@/components/ui/primitives";
import { SourceChips } from "@/components/ui/SourceChips";

export function SummaryCard() {
  const { analysis, analysisStatus } = useMeeting();
  const loading = analysisStatus === "loading";

  return (
    <Panel
      title="Summary"
      icon={ScrollText}
      description="Generated only from the transcript"
      actions={
        <>
          {!loading && <AnalysisOriginBadge />}
          {analysis && !loading && <CopyButton getText={() => analysis.summary} label="Copy summary" successMessage="Summary copied" />}
        </>
      }
    >
      {loading ? (
        <div className="relative space-y-4 overflow-hidden">
          <div className="scan-line" aria-hidden />
          <SkeletonLines lines={4} />
          <AiThinking label="Reading the transcript and extracting decisions…" />
        </div>
      ) : analysis ? (
        <div className="fade-in space-y-4">
          <StreamText key={analysis.summary} text={analysis.summary} className="text-sm leading-relaxed text-ink-200" />
          {analysis.open_questions.length > 0 && (
            <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-200">
                <HelpCircle className="size-3.5" aria-hidden />
                Open question{analysis.open_questions.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-1.5 space-y-2">
                {analysis.open_questions.map((question) => (
                  <li key={question.text} className="space-y-1">
                    <p className="text-sm text-ink-200">{question.text}</p>
                    <SourceChips ids={question.source_segment_ids} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <GenerateButton size="sm" />
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No summary yet"
          description="Generate a concise summary, the decisions made and the action items, each linked to the transcript."
          action={<GenerateButton />}
        />
      )}
    </Panel>
  );
}
