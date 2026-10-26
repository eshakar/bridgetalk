"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, CheckCircle2, Database, FlaskConical, Menu, RotateCcw } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { LanguageSelector } from "@/components/meeting/LanguageSelector";
import { Badge, Button } from "@/components/ui/primitives";
import SplitText from "@/components/reactbits/SplitText";
import { formatDate, formatDuration } from "@/lib/utils";

export function AppHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const { meeting, resetMeeting, storageMode, apiStatus, isDemo, switching } = useMeeting();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    await resetMeeting();
    setResetting(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-accent-400/10 bg-ink-950/80 backdrop-blur-md">
      <AnimatePresence>
        {switching && (
          <motion.div
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[image:var(--ai-gradient)]"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 0.85 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            aria-hidden
          />
        )}
      </AnimatePresence>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          className="focus-ring -ml-1 rounded-md p-1.5 text-ink-300 hover:text-ink-100 lg:hidden"
          aria-label="Open navigation"
          aria-controls="app-sidebar"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight text-ink-50 sm:text-lg">
              <SplitText key={meeting.title} text={meeting.title} tag="span" splitType="chars" effect="blur" trigger="load" delay={25} duration={0.6} hoverEffect="wave" textAlign="left" />
            </h1>
            <Badge tone="green" icon={CheckCircle2}>
              {meeting.status === "completed" ? "Completed" : meeting.status === "live" ? "Live" : "Scheduled"}
            </Badge>
            {meeting.is_simulated && (
              <Badge tone="amber" icon={FlaskConical}>
                Simulated sample
              </Badge>
            )}
            {apiStatus !== "checking" &&
              (storageMode === "mongodb" ? (
                <span title="Insights, questions and action-item changes are saved to MongoDB">
                  <Badge icon={Database}>Saved to MongoDB</Badge>
                </span>
              ) : (
                <span title="The database or API is unavailable. Changes stay in this browser session and are not saved.">
                  <Badge tone="amber" icon={Database}>
                    Demo mode · not saved
                  </Badge>
                </span>
              ))}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(meeting.date)} · {formatDuration(meeting.duration_seconds)} · {meeting.speakers.length} participants
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <Button icon={RotateCcw} onClick={handleReset} disabled={resetting} aria-label={isDemo ? "Reset sample meeting" : "Clear saved insights for this meeting"} className={resetting ? "[&>svg]:animate-spin" : undefined}>
            <span className="hidden sm:inline">{resetting ? "Resetting…" : isDemo ? "Reset sample" : "Clear insights"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
