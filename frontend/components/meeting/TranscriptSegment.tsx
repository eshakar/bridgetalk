"use client";

import { Languages } from "lucide-react";
import type { Language, LanguageCode, Segment, Speaker, TranscriptView } from "@/types/meeting";
import { cn, formatTimestamp, initials } from "@/lib/utils";

const LANG_ATTR: Record<LanguageCode, string> = { en: "en", bn: "bn", hi: "hi" };

export function TranscriptSegment({
  segment,
  speaker,
  tone,
  view,
  displayLanguage,
  languages,
  highlighted,
}: {
  segment: Segment;
  speaker: Speaker | undefined;
  tone: string;
  view: TranscriptView;
  displayLanguage: LanguageCode;
  languages: Map<LanguageCode, Language>;
  highlighted: boolean;
}) {
  const original = segment.text[segment.original_language] ?? "";
  const translation = segment.text[displayLanguage];
  const isOriginal = segment.original_language === displayLanguage;
  const hasTranslation = Boolean(translation) && !isOriginal;
  const originalLabel = languages.get(segment.original_language)?.label ?? segment.original_language;
  const targetLabel = languages.get(displayLanguage)?.native_label ?? displayLanguage;

  // "translated" falls back to the original when no translation exists for the chosen language.
  const primaryText = view === "translated" && hasTranslation ? translation! : original;
  const primaryLang = view === "translated" && hasTranslation ? displayLanguage : segment.original_language;
  const showSecondary = view === "both" && hasTranslation;

  return (
    <li
      id={`segment-${segment.id}`}
      className={cn(
        "group flex gap-3 rounded-xl px-3 py-3 transition-colors duration-500",
        highlighted ? "bg-electric-500/10 shadow-[0_0_24px_-8px_rgb(34_211_238/0.6)] ring-1 ring-electric-400/50" : "hover:bg-white/[0.03]",
      )}
    >
      <span
        className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1", tone)}
        aria-hidden
      >
        {initials(speaker?.name ?? "?")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-ink-100">{speaker?.name ?? "Unknown speaker"}</span>
          {speaker?.role && <span className="text-xs text-ink-400">{speaker.role}</span>}
          <span className="ml-auto flex items-center gap-2">
            <span className="rounded bg-ink-800 px-1.5 font-mono text-[10px] uppercase text-ink-300" title={`Spoken in ${originalLabel}`}>
              {segment.original_language}
            </span>
            <time className="font-mono text-xs text-ink-400 tabular-nums">{formatTimestamp(segment.start_seconds)}</time>
          </span>
        </div>

        <p lang={LANG_ATTR[primaryLang]} className="mt-1 text-[15px] leading-relaxed text-ink-200">
          {primaryText}
        </p>
        {view === "translated" && hasTranslation && (
          <p className="mt-1 text-[11px] text-ink-500">Translated from {originalLabel}</p>
        )}

        {showSecondary && (
          <div className="mt-2 flex gap-2 border-l-2 border-neon-400/40 pl-3">
            <Languages className="mt-1 size-3.5 shrink-0 text-accent-300/80" aria-label={`Translation (${targetLabel})`} />
            <p lang={LANG_ATTR[displayLanguage]} className="text-sm leading-relaxed text-ink-300">
              {translation}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
