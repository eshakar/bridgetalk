import type { LanguageCode, Meeting, Segment, Speaker } from "@/types/meeting";

/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const LANGUAGE_NAMES: Record<LanguageCode, string> = { en: "English", bn: "Bengali", hi: "Hindi" };

export function segmentText(segment: Segment, language: LanguageCode): string | undefined {
  return segment.text[language];
}

export function speakerMap(meeting: Meeting): Map<string, Speaker> {
  return new Map(meeting.speakers.map((speaker) => [speaker.id, speaker]));
}

/** Visual tone per speaker, assigned by speaker order. */
const SPEAKER_TONES = [
  "bg-violet-500/15 text-violet-200 ring-violet-400/30",
  "bg-sky-500/15 text-sky-200 ring-sky-400/30",
  "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  "bg-amber-500/15 text-amber-200 ring-amber-400/30",
];

export function speakerTone(meeting: Meeting, speakerId: string): string {
  const index = meeting.speakers.findIndex((speaker) => speaker.id === speakerId);
  return SPEAKER_TONES[(index < 0 ? 0 : index) % SPEAKER_TONES.length];
}

/** Guess a line's language from its script: Bengali, Devanagari (Hindi) or Latin (English). */
export function detectLanguage(text: string): LanguageCode {
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

/** Copy text to the clipboard, with a fallback for non-secure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
