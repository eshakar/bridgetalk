"use client";

// Small presentational building blocks shared across the dashboard.

import type { ButtonHTMLAttributes, ComponentType, CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { cn } from "@/lib/utils";

const PANEL_SURFACE = {
  "--spotlight-card-surface": "rgb(7 9 22 / 0.9)",
  "--spotlight-card-border": "linear-gradient(140deg, rgb(34 211 238 / 0.35), rgb(139 92 246 / 0.12) 40%, rgb(232 121 249 / 0.28))",
  "--spotlight-card-shadow": "0 24px 60px -28px rgb(0 0 0 / 0.9), 0 0 40px -30px rgb(139 92 246 / 0.6)",
} as CSSProperties;

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export function Panel({
  title,
  icon: Icon,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: IconType;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <motion.section
      className={cn("flex min-w-0 flex-col", className)}
      aria-label={title}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <SpotlightCard
        className="flex flex-1 flex-col rounded-2xl! p-0!"
        style={PANEL_SURFACE}
        spotlightColor="rgb(139 92 246 / 0.9)"
        intensity={0.18}
        spotlightSize={320}
        borderGlow={0.9}
      >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-electric-500/25 to-accent-500/25 text-electric-200 ring-1 ring-electric-400/30">
              <Icon className="size-3.5" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink-100">{title}</h2>
            {description && <p className="truncate text-xs text-ink-400">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </header>
      <div className={cn("flex-1 p-5", bodyClassName)}>{children}</div>
      </SpotlightCard>
    </motion.section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn-ai text-white hover:brightness-110",
  secondary:
    "border border-accent-400/25 bg-ink-800/60 text-ink-100 backdrop-blur hover:border-electric-400/50 hover:bg-ink-700/60 hover:shadow-[0_0_20px_-6px_rgb(34_211_238/0.5)]",
  ghost: "text-ink-300 hover:bg-white/5 hover:text-ink-100",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md"; icon?: IconType }) {
  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />}
      {children}
    </button>
  );
}

type BadgeTone = "neutral" | "violet" | "blue" | "green" | "amber";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink-800/70 text-ink-300 ring-ink-600/60",
  violet: "bg-accent-500/15 text-accent-200 ring-accent-400/35 shadow-[0_0_12px_-4px_rgb(139_92_246/0.7)]",
  blue: "bg-electric-500/12 text-electric-200 ring-electric-400/30",
  green: "bg-emerald-500/12 text-emerald-200 ring-emerald-400/25",
  amber: "bg-amber-500/12 text-amber-200 ring-amber-400/25",
};

export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: IconType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconType;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-8 text-center", className)}>
      <motion.span
        className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-electric-500/20 via-accent-500/20 to-neon-500/20 text-electric-200 ring-1 ring-accent-400/30"
        animate={{ y: [0, -5, 0], boxShadow: ["0 0 0px rgb(139 92 246 / 0)", "0 0 24px rgb(139 92 246 / 0.45)", "0 0 0px rgb(139 92 246 / 0)"] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="size-4.5" aria-hidden />
      </motion.span>
      <p className="mt-3 text-sm font-medium text-ink-100">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden />;
}

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  );
}
