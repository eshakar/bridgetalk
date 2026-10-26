"use client";

import { HelpCircle } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { SourceChips } from "@/components/ui/SourceChips";

export function OpenQuestionsPanel() {
  const { analysis, analysisStatus } = useMeeting();
  const questions = analysis?.open_questions ?? [];

  return (
    <Panel title="Open questions" icon={HelpCircle} description="Raised in the meeting but not resolved">
      {analysisStatus === "loading" ? (
        <Skeleton className="h-14 w-full rounded-lg" />
      ) : !analysis ? (
        <EmptyState icon={HelpCircle} title="Not analysed yet" description="Generate intelligence to surface unresolved questions." />
      ) : questions.length === 0 ? (
        <EmptyState icon={HelpCircle} title="Nothing left open" description="Every question raised in the meeting got an answer." />
      ) : (
        <ul className="fade-in space-y-2.5">
          {questions.map((question) => (
            <li key={question.text} className="space-y-1.5 rounded-lg border border-amber-400/20 bg-amber-500/[0.06] p-3">
              <p className="text-sm text-ink-100">{question.text}</p>
              <SourceChips ids={question.source_segment_ids} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
