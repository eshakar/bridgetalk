"use client";

import { Languages } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import type { LanguageCode } from "@/types/meeting";

export function LanguageSelector({ id = "display-language" }: { id?: string }) {
  const { meeting, displayLanguage, setDisplayLanguage } = useMeeting();

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Transcript display language
      </label>
      <Languages className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <select
        id={id}
        value={displayLanguage}
        onChange={(event) => setDisplayLanguage(event.target.value as LanguageCode)}
        className="focus-ring h-9 appearance-none rounded-lg border border-ink-700 bg-ink-800/80 pr-8 pl-8 text-sm text-ink-100 transition-colors hover:border-ink-600"
      >
        {meeting.languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
            {language.native_label !== language.label ? ` · ${language.native_label}` : ""}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-400"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
