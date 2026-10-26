"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CalendarDays, Clock3, Database, FlaskConical, Globe2, Plus, Trash2, Users } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { Badge, Button, EmptyState } from "@/components/ui/primitives";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import type { MeetingSummary } from "@/types/meeting";

function MeetingCard({ summary, index }: { summary: MeetingSummary; index: number }) {
  const router = useRouter();
  const { meeting, openMeeting, removeMeeting, switching } = useMeeting();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOpen = summary.id === meeting.id;

  async function handleOpen() {
    if (await openMeeting(summary.id)) router.push("/");
  }

  async function handleDelete() {
    setDeleting(true);
    const ok = await removeMeeting(summary.id);
    if (!ok) {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "panel group flex flex-col p-5 transition-[border-color,box-shadow] duration-300",
        isOpen ? "border-electric-400/40! shadow-[0_0_32px_-12px_rgb(34_211_238/0.6)]" : "hover:border-accent-400/35!",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-ink-50">{summary.title}</h3>
        {isOpen && <Badge tone="blue">Open now</Badge>}
        {summary.is_simulated && (
          <Badge tone="amber" icon={FlaskConical}>
            Sample
          </Badge>
        )}
      </div>
      {summary.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">{summary.description}</p>}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-400">
        {summary.date && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden /> {formatDate(summary.date)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock3 className="size-3.5" aria-hidden /> {formatDuration(summary.duration_seconds)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden /> {summary.speaker_count} participant{summary.speaker_count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Globe2 className="size-3.5 text-ink-500" aria-hidden />
        {summary.languages.map((language) => (
          <span
            key={language.code}
            className="rounded bg-electric-500/10 px-1.5 font-mono text-[11px] uppercase text-electric-200 ring-1 ring-electric-400/20"
          >
            {language.code}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2 pt-1">
        <Button variant={isOpen ? "secondary" : "primary"} size="sm" onClick={handleOpen} disabled={switching} className="flex-1">
          {isOpen ? "View dashboard" : "Open meeting"}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Button>
        {!summary.is_demo && (
          <AnimatePresence mode="wait" initial={false}>
            {confirming ? (
              <motion.div key="confirm" className="flex gap-1.5" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
                  Keep
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="border-rose-400/40! bg-rose-500/15! text-rose-200 hover:bg-rose-500/25!"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirming(true)} aria-label={`Delete ${summary.title}`} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.article>
  );
}

export function MeetingsList() {
  const { meetings, meeting, apiStatus } = useMeeting();

  if (meetings === null) {
    return (
      <div className="panel p-2">
        <EmptyState
          icon={Database}
          title={apiStatus === "checking" ? "Loading meetings…" : "Meetings need the database"}
          description={
            apiStatus === "checking"
              ? "Fetching your saved meetings from MongoDB."
              : `The API or MongoDB is unavailable, so only the built-in sample (“${meeting.title}”) is shown on the dashboard.`
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link
          href="/meetings/new"
          className="focus-ring group flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-accent-400/30 bg-ink-900/40 p-5 text-center transition-all duration-300 hover:border-electric-400/60 hover:bg-ink-900/70 hover:shadow-[0_0_40px_-16px_rgb(34_211_238/0.7)]"
        >
          <span className="btn-ai grid size-12 place-items-center rounded-2xl text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
            <Plus className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-ink-50">New meeting</span>
          <span className="max-w-56 text-xs leading-relaxed text-ink-400">
            Add participants and paste or type the transcript. Gemini translates it into English, Bengali and Hindi.
          </span>
        </Link>
      </motion.div>
      <AnimatePresence mode="popLayout">
        {meetings.map((summary, index) => (
          <MeetingCard key={summary.id} summary={summary} index={index + 1} />
        ))}
      </AnimatePresence>
    </div>
  );
}
