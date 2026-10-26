"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { formatTimestamp } from "@/lib/utils";

/** Timestamp chips that jump to the cited transcript segments. */
export function SourceChips({ ids, label = "Sources" }: { ids: string[]; label?: string }) {
  const { meeting, focusSegment } = useMeeting();
  const router = useRouter();
  const pathname = usePathname();
  const segments = ids
    .map((id) => meeting.segments.find((segment) => segment.id === id))
    .filter((segment) => segment !== undefined);

  if (!segments.length) return null;

  function jump(id: string) {
    focusSegment(id);
    if (pathname !== "/") router.push("/");
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[11px] text-ink-400">{label}</span>
      {segments.map((segment) => (
        <button
          key={segment.id}
          type="button"
          onClick={() => jump(segment.id)}
          className="focus-ring rounded px-1.5 py-0.5 font-mono text-[11px] text-electric-300 ring-1 ring-electric-400/20 transition-colors hover:bg-electric-500/10 hover:text-electric-200"
          aria-label={`Jump to transcript at ${formatTimestamp(segment.start_seconds)}`}
        >
          {formatTimestamp(segment.start_seconds)}
        </button>
      ))}
    </div>
  );
}
