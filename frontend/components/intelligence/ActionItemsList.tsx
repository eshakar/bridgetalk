"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Check, ListChecks, UserRound } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { GenerateButton } from "@/components/intelligence/AnalysisControls";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { SourceChips } from "@/components/ui/SourceChips";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/types/meeting";

type Filter = "all" | "pending" | "done";

function formatItems(items: ActionItem[], completed: Record<string, boolean>): string {
  return items
    .map(
      (item) =>
        `[${completed[item.id] ? "x" : " "}] ${item.task} | Owner: ${item.owner ?? "Unassigned"} | Deadline: ${item.deadline ?? "Not specified"}`,
    )
    .join("\n");
}

export function ActionItemsList({ withFilters = false }: { withFilters?: boolean }) {
  const { analysis, analysisStatus, completedItems, toggleItem } = useMeeting();
  const [filter, setFilter] = useState<Filter>("all");
  const items = analysis?.action_items ?? [];
  const visible = items.filter((item) =>
    filter === "all" ? true : filter === "done" ? completedItems[item.id] : !completedItems[item.id],
  );
  const doneCount = items.filter((item) => completedItems[item.id]).length;

  return (
    <Panel
      title="Action items"
      icon={ListChecks}
      description={analysis ? `${doneCount} of ${items.length} complete` : "Owners and deadlines when stated"}
      actions={
        items.length > 0 && (
          <CopyButton label="Copy action items" successMessage="Action items copied" getText={() => formatItems(items, completedItems)} />
        )
      }
    >
      {withFilters && items.length > 0 && (
        <div role="tablist" aria-label="Filter action items" className="mb-4 flex gap-1">
          {(["all", "pending", "done"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "focus-ring relative rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === value ? "text-ink-50" : "text-ink-400 hover:text-ink-200",
              )}
            >
              {filter === value && (
                <motion.span
                  layoutId="action-filter"
                  className="absolute inset-0 rounded-md bg-accent-500/20 ring-1 ring-accent-400/40"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{value}</span>
            </button>
          ))}
        </div>
      )}

      {analysisStatus === "loading" ? (
        <div className="space-y-3" role="status" aria-label="Loading action items">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !analysis ? (
        <EmptyState
          icon={ListChecks}
          title="No action items yet"
          description="Run the analysis to capture who committed to what, and by when."
          action={<GenerateButton size="sm" />}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={items.length ? `No ${filter} items` : "No action items"}
          description={items.length ? "Try a different filter." : "Nobody committed to a task in this transcript."}
        />
      ) : (
        <ul className="space-y-2">
          <AnimatePresence mode="popLayout">
          {visible.map((item, index) => {
            const done = Boolean(completedItems[item.id]);
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: done ? 0.7 : 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex gap-3 rounded-lg border p-3 transition-colors",
                  done ? "border-emerald-400/15 bg-ink-900/30" : "border-accent-400/15 bg-ink-900/50 hover:border-electric-400/40",
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={`Mark "${item.task}" as ${done ? "pending" : "done"}`}
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "focus-ring mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-all",
                    done ? "glow-cyan border-transparent bg-[image:var(--ai-gradient)] text-white" : "border-ink-500 hover:border-electric-400",
                  )}
                >
                  <AnimatePresence>
                    {done && (
                      <motion.span
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      >
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className={cn("text-sm leading-snug transition-colors", done ? "text-ink-500 line-through" : "text-ink-100")}>
                    {item.task}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <span className={cn("flex items-center gap-1", item.owner ? "text-ink-300" : "text-amber-300/90")}>
                      <UserRound className="size-3.5" aria-hidden />
                      {item.owner ?? "Unassigned"}
                    </span>
                    <span className={cn("flex items-center gap-1", item.deadline ? "text-ink-300" : "text-ink-500")}>
                      <Calendar className="size-3.5" aria-hidden />
                      {item.deadline ?? "No deadline stated"}
                    </span>
                    <SourceChips ids={item.source_segment_ids} label="" />
                  </div>
                </div>
              </motion.li>
            );
          })}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
