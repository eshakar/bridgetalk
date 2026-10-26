"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarDays, CheckSquare, Gavel, LayoutDashboard, Plus, Settings, Sparkles, X } from "lucide-react";
import GradientText from "@/components/reactbits/GradientText";
import ShinyText from "@/components/reactbits/ShinyText";
import { BrandMark } from "@/components/ui/BrandMark";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/decisions", label: "Decisions", icon: Gavel },
  { href: "/action-items", label: "Action items", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const STATUS_COPY = {
  checking: { dot: "bg-ink-400 animate-pulse", text: "Checking API…" },
  online: { dot: "bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)] animate-pulse", text: "API connected" },
  offline: { dot: "bg-amber-400", text: "Offline mode" },
} as const;

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { analysis, completedItems, apiStatus, health, storageMode } = useMeeting();
  const openItems = analysis ? analysis.action_items.filter((item) => !completedItems[item.id]).length : null;
  const status = STATUS_COPY[apiStatus];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-ink-950/70 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-accent-400/10 bg-ink-950/90 transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg" onClick={onClose}>
            <BrandMark />
            <GradientText colors={["#22d3ee", "#8b5cf6", "#e879f9", "#22d3ee"]} animationSpeed={6} className="text-[16px] font-semibold tracking-tight">
              BridgeTalk
            </GradientText>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-md p-1.5 text-ink-400 hover:text-ink-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3 pb-3">
          <Link
            href="/meetings/new"
            onClick={onClose}
            className="focus-ring btn-ai flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="size-4" aria-hidden />
            New meeting
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2" aria-label="Main">
          <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-500">Workspace</p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active ? "text-ink-50" : "text-ink-300 hover:bg-white/[0.04] hover:text-ink-100",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-electric-500/15 via-accent-500/15 to-transparent ring-1 ring-accent-400/25"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        aria-hidden
                      >
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-electric-400 shadow-[0_0_10px_rgb(34_211_238)]" />
                      </motion.span>
                    )}
                    <Icon className={cn("relative size-4 transition-transform group-hover:scale-110", active ? "text-electric-300" : "text-ink-400 group-hover:text-ink-300")} aria-hidden />
                    <span className="relative flex-1">{label}</span>
                    {href === "/action-items" && openItems !== null && openItems > 0 && (
                      <span className="relative rounded-md bg-neon-500/20 px-1.5 text-[11px] font-medium text-neon-300 ring-1 ring-neon-400/30">{openItems}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ai-ring m-3 rounded-xl bg-ink-900/70 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium">
            <Sparkles className="size-3.5 text-neon-300" aria-hidden />
            <ShinyText text={health?.ai_configured ? "Powered by Google Gemini" : "AI engine standby"} color="#9aa2d0" shineColor="#ffffff" speed={3} />
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-200">
            <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden />
            {status.text}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
            {apiStatus === "online"
              ? `${storageMode === "mongodb" ? "MongoDB connected" : "Database unavailable, demo mode"} · ${
                  health?.ai_configured ? `AI via ${health.ai_model ?? "Gemini"}` : "rules engine"
                }`
              : apiStatus === "offline"
                ? "Using the built-in sample and in-browser analysis."
                : "Connecting to the BridgeTalk API."}
          </p>
        </div>
      </aside>
    </>
  );
}
