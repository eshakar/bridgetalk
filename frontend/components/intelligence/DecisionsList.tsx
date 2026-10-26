"use client";

import { motion } from "motion/react";
import { Gavel } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { GenerateButton } from "@/components/intelligence/AnalysisControls";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { SourceChips } from "@/components/ui/SourceChips";
import { speakerMap } from "@/lib/utils";

/** Decisions with their supporting transcript citations. `detailed` also quotes the source text. */
export function DecisionsList({ detailed = false }: { detailed?: boolean }) {
  const { meeting, analysis, analysisStatus } = useMeeting();
  const decisions = analysis?.decisions ?? [];
  const speakers = speakerMap(meeting);

  return (
    <Panel
      title="Decisions"
      icon={Gavel}
      description={analysis ? `${decisions.length} explicit decision${decisions.length === 1 ? "" : "s"}` : "Agreed outcomes"}
      actions={
        decisions.length > 0 && (
          <CopyButton
            label="Copy decisions"
            successMessage="Decisions copied"
            getText={() => decisions.map((d, i) => `${i + 1}. ${d.text}`).join("\n")}
          />
        )
      }
    >
      {analysisStatus === "loading" ? (
        <div className="space-y-3" role="status" aria-label="Loading decisions">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : !analysis ? (
        <EmptyState
          icon={Gavel}
          title="No decisions extracted"
          description="Run the analysis to list what the team explicitly agreed on."
          action={<GenerateButton size="sm" />}
        />
      ) : decisions.length === 0 ? (
        <EmptyState icon={Gavel} title="No explicit decisions" description="The transcript does not record any agreed decision." />
      ) : (
        <ol className="space-y-2.5">
          {decisions.map((decision, index) => (
            <motion.li
              key={decision.text}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: 3 }}
              className="flex gap-3 rounded-lg border border-accent-400/15 bg-ink-900/50 p-3 transition-colors hover:border-electric-400/40 hover:bg-ink-900/70"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-electric-500/30 to-accent-500/30 font-mono text-[11px] font-semibold text-white ring-1 ring-electric-400/30">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm leading-relaxed text-ink-100">{decision.text}</p>
                {detailed &&
                  decision.source_segment_ids.map((id) => {
                    const segment = meeting.segments.find((s) => s.id === id);
                    if (!segment) return null;
                    return (
                      <blockquote key={id} className="border-l-2 border-ink-700 pl-3 text-xs leading-relaxed text-ink-400">
                        <span className="font-medium text-ink-300">{speakers.get(segment.speaker_id)?.name}:</span>{" "}
                        <span lang={segment.original_language}>{segment.text[segment.original_language]}</span>
                      </blockquote>
                    );
                  })}
                <SourceChips ids={decision.source_segment_ids} />
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
