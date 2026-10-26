"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { Clock3, Globe2, ListChecks, Users } from "lucide-react";
import CountUp from "@/components/reactbits/CountUp";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { cn, formatDuration, initials, speakerTone } from "@/lib/utils";

const ACCENTS = [
  { glow: "rgb(34 211 238 / 0.9)", icon: "from-electric-500/30 to-electric-500/5 text-electric-200 ring-electric-400/30" },
  { glow: "rgb(139 92 246 / 0.9)", icon: "from-accent-500/30 to-accent-500/5 text-accent-200 ring-accent-400/30" },
  { glow: "rgb(232 121 249 / 0.9)", icon: "from-neon-500/30 to-neon-500/5 text-neon-300 ring-neon-400/30" },
  { glow: "rgb(52 211 153 / 0.9)", icon: "from-emerald-500/30 to-emerald-500/5 text-emerald-200 ring-emerald-400/30" },
];

const CARD_SURFACE = {
  "--spotlight-card-surface": "rgb(7 9 22 / 0.9)",
  "--spotlight-card-border": "linear-gradient(140deg, rgb(255 255 255 / 0.14), rgb(139 92 246 / 0.12) 50%, rgb(34 211 238 / 0.2))",
} as CSSProperties;

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  index,
}: {
  icon: typeof Clock3;
  label: string;
  value: ReactNode;
  detail: ReactNode;
  index: number;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      style={{ willChange: "transform" }}
    >
      <SpotlightCard className="h-full rounded-2xl! px-4! py-4!" style={CARD_SURFACE} spotlightColor={accent.glow} intensity={0.22} borderGlow={1}>
        <div className="flex items-center gap-2 text-xs font-medium text-ink-300">
          <span className={cn("grid size-6 place-items-center rounded-md bg-gradient-to-br ring-1", accent.icon)}>
            <Icon className="size-3.5" aria-hidden />
          </span>
          {label}
        </div>
        <div className="mt-2.5 text-2xl font-semibold tracking-tight text-ink-50 tabular-nums">{value}</div>
        <div className="mt-1.5 min-h-5 text-xs text-ink-400">{detail}</div>
      </SpotlightCard>
    </motion.div>
  );
}

function Count({ to }: { to: number }) {
  return <CountUp to={to} duration={1.4} trigger="load" />;
}

export function MeetingOverview() {
  const { meeting, analysis, analysisStatus, completedItems } = useMeeting();
  const items = analysis?.action_items ?? [];
  const done = items.filter((item) => completedItems[item.id]).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <StatCard index={0} icon={Clock3} label="Duration" value={formatDuration(meeting.duration_seconds)} detail={`${meeting.segments.length} transcript segments`} />
      <StatCard
        index={1}
        icon={Globe2}
        label="Languages"
        value={<Count to={meeting.languages.length} />}
        detail={
          <span className="flex flex-wrap gap-1">
            {meeting.languages.map((language) => (
              <span key={language.code} className="rounded bg-electric-500/10 px-1.5 font-mono text-[11px] uppercase text-electric-200 ring-1 ring-electric-400/20">
                {language.code}
              </span>
            ))}
          </span>
        }
      />
      <StatCard
        index={2}
        icon={Users}
        label="Speakers"
        value={<Count to={meeting.speakers.length} />}
        detail={
          <span className="flex -space-x-1">
            {meeting.speakers.map((speaker) => (
              <span key={speaker.id} title={speaker.name} className="rounded-full bg-ink-900 ring-2 ring-ink-900">
                <span className={cn("grid size-6 place-items-center rounded-full text-[9px] font-semibold ring-1", speakerTone(meeting, speaker.id))}>
                  {initials(speaker.name)}
                </span>
              </span>
            ))}
          </span>
        }
      />
      <StatCard
        index={3}
        icon={ListChecks}
        label="Action items"
        value={analysis ? <Count to={items.length} /> : "—"}
        detail={
          analysis ? (
            <span className="flex items-center gap-2">
              <span className="h-1 w-16 overflow-hidden rounded-full bg-ink-800">
                <motion.span
                  className="block h-full rounded-full bg-[image:var(--ai-gradient)]"
                  animate={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </span>
              {done}/{items.length} done
            </span>
          ) : analysisStatus === "loading" ? (
            <span className="text-ai">Gemini is extracting…</span>
          ) : (
            "Generate intelligence to extract"
          )
        }
      />
    </div>
  );
}
