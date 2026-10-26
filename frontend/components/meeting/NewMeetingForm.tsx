"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardPaste, Database, FileText, Languages, ListPlus, Plus, Sparkles, Trash2, UserPlus, Users, Wand2 } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import { AiThinking } from "@/components/effects/AiThinking";
import ClickSpark from "@/components/reactbits/ClickSpark";
import { Badge, Button, EmptyState, Panel } from "@/components/ui/primitives";
import { cn, detectLanguage } from "@/lib/utils";
import type { LanguageCode } from "@/types/meeting";

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা · Bengali" },
  { code: "hi", label: "हिन्दी · Hindi" },
];

const EXAMPLE = `Esha: Welcome everyone. We need to finalise the onboarding redesign today.
Arjun: डिज़ाइन लगभग तैयार है, बस मोबाइल वर्शन बाकी है।
Esha: Let's decide to ship the web version first and mobile next sprint.
Mitali: আমি একমত। আমি শুক্রবারের মধ্যে টেস্ট প্ল্যান লিখে দেব।
Arjun: Who will update the help docs?
Esha: I'm not sure yet, let's discuss on Monday.`;

interface Participant {
  key: number;
  name: string;
  role: string;
  language: LanguageCode;
}

interface Line {
  key: number;
  speaker: number; // participant key
  language: LanguageCode;
  /** False once the user picks a language by hand, so typing no longer overrides it. */
  autoLanguage: boolean;
  text: string;
}

let nextKey = 1;
const key = () => nextKey++;

const inputClass =
  "focus-ring h-10 w-full rounded-lg border border-accent-400/15 bg-ink-950/70 px-3 text-sm text-ink-100 placeholder:text-ink-500 transition-[border-color,box-shadow] duration-200 hover:border-accent-400/30 focus:border-electric-400/60 focus:shadow-[0_0_0_3px_rgb(34_211_238/0.12)]";

/** A labelled field; `children` receives the input's id so the label is associated with it. */
function Field({ label, children, hint }: { label: string; children: (id: string) => ReactNode; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink-300">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

/** Parse "Name: text" lines. Lines without a name continue the previous speaker's text. */
function parseTranscript(raw: string): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^([^:：]{1,60})[:：]\s*(.+)$/.exec(line);
    if (match) out.push({ name: match[1].replace(/^\[?[\d:.\s]+\]?\s*/, "").trim(), text: match[2].trim() });
    else if (out.length) out[out.length - 1].text += ` ${line}`;
  }
  return out.filter((entry) => entry.name && entry.text);
}

export function NewMeetingForm() {
  const router = useRouter();
  const { createMeeting, meetings, health, apiStatus } = useMeeting();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState<Participant[]>(() => [
    { key: key(), name: "", role: "", language: "en" },
    { key: key(), name: "", role: "", language: "en" },
  ]);
  const [lines, setLines] = useState<Line[]>([]);
  const [mode, setMode] = useState<"paste" | "lines">("paste");
  const [pasted, setPasted] = useState("");
  const [translate, setTranslate] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const aiReady = Boolean(health?.ai_configured);
  const dbReady = meetings !== null;

  function updateParticipant(k: number, patch: Partial<Participant>) {
    setParticipants((list) => list.map((p) => (p.key === k ? { ...p, ...patch } : p)));
  }

  function removeParticipant(k: number) {
    setParticipants((list) => (list.length > 1 ? list.filter((p) => p.key !== k) : list));
    setLines((list) => list.filter((line) => line.speaker !== k));
  }

  function addLine(after?: number) {
    setLines((list) => {
      const previous = after !== undefined ? list.find((l) => l.key === after) : list[list.length - 1];
      // Alternate speakers by default: the next line goes to someone other than the last speaker.
      const lastIndex = previous ? participants.findIndex((p) => p.key === previous.speaker) : -1;
      const speaker = participants[(lastIndex + 1) % participants.length];
      const line: Line = { key: key(), speaker: speaker.key, language: speaker.language, autoLanguage: true, text: "" };
      if (after === undefined) return [...list, line];
      const index = list.findIndex((l) => l.key === after);
      return [...list.slice(0, index + 1), line, ...list.slice(index + 1)];
    });
  }

  function updateLine(k: number, patch: Partial<Line>) {
    setLines((list) =>
      list.map((line) => {
        if (line.key !== k) return line;
        const next = { ...line, ...patch };
        if (patch.text !== undefined && next.autoLanguage && patch.text.trim()) next.language = detectLanguage(patch.text);
        return next;
      }),
    );
  }

  /** Turn pasted "Name: text" lines into editable lines, adding any new speakers. */
  function convertPasted(source = pasted) {
    const parsed = parseTranscript(source);
    if (!parsed.length) {
      setErrors(["Couldn't find any “Name: text” lines in the pasted transcript."]);
      return;
    }
    let roster = participants.filter((p) => p.name.trim());
    const findOrAdd = (name: string, sample: string) => {
      const existing = roster.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      const created: Participant = { key: key(), name, role: "", language: detectLanguage(sample) };
      roster = [...roster, created];
      return created;
    };
    const newLines = parsed.map(({ name, text }) => {
      const speaker = findOrAdd(name, text);
      return { key: key(), speaker: speaker.key, language: detectLanguage(text), autoLanguage: true, text };
    });
    setParticipants(roster.length ? roster : participants);
    setLines(newLines);
    setErrors([]);
    setMode("lines");
  }

  function loadExample() {
    if (!title) setTitle("Onboarding redesign sync");
    setPasted(EXAMPLE);
    convertPasted(EXAMPLE);
  }

  function validate(): string[] {
    const problems: string[] = [];
    if (!title.trim()) problems.push("Give the meeting a title.");
    const named = participants.filter((p) => p.name.trim());
    if (!named.length) problems.push("Add at least one participant with a name.");
    const names = named.map((p) => p.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) problems.push("Participant names must be unique.");
    const filled = lines.filter((l) => l.text.trim());
    if (!filled.length) problems.push(mode === "paste" ? "Paste a transcript and convert it to lines first." : "Add at least one transcript line.");
    if (filled.some((l) => !named.some((p) => p.key === l.speaker)))
      problems.push("Every transcript line needs a speaker who has a name.");
    return problems;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length) return;
    const named = participants.filter((p) => p.name.trim());
    const index = new Map(named.map((p, i) => [p.key, i]));
    setSaving(true);
    const result = await createMeeting({
      title: title.trim(),
      description: description.trim(),
      date,
      participants: named.map((p) => ({ name: p.name.trim(), role: p.role.trim(), primary_language: p.language })),
      lines: lines
        .filter((l) => l.text.trim())
        .map((l) => ({ speaker: index.get(l.speaker)!, language: l.language, text: l.text.trim() })),
      translate: translate && aiReady,
    });
    if (result.ok) {
      router.push("/");
      return;
    }
    setSaving(false);
    setErrors([result.reason]);
  }

  if (!dbReady) {
    return (
      <div className="panel p-2">
        <EmptyState
          icon={Database}
          title={apiStatus === "checking" ? "Connecting…" : "Creating meetings needs the database"}
          description={
            apiStatus === "checking"
              ? "Checking that MongoDB is available."
              : "The API or MongoDB is unavailable. Start the backend with a working MONGODB_URI, then reload."
          }
        />
      </div>
    );
  }

  const filledLines = lines.filter((l) => l.text.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-12" noValidate>
      <div className="space-y-6 xl:col-span-4">
        <Panel title="Meeting details" icon={FileText}>
          <div className="space-y-4">
            <Field label="Title">
              {(id) => <input id={id} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q4 roadmap review" maxLength={200} />}
            </Field>
            <Field label="Date" hint="Leave empty for today">
              {(id) => <input id={id} type="date" className={cn(inputClass, "[color-scheme:dark]")} value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
            <Field label="Description" hint="Optional">
              {(id) => <textarea
                id={id}
                className={cn(inputClass, "h-20 resize-none py-2")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                placeholder="What was this meeting about?"
              />}
            </Field>
          </div>
        </Panel>

        <Panel
          title="Participants"
          icon={Users}
          description={`${participants.filter((p) => p.name.trim()).length} named`}
          actions={
            <Button
              size="sm"
              variant="ghost"
              icon={UserPlus}
              disabled={participants.length >= 20}
              onClick={() => setParticipants((list) => [...list, { key: key(), name: "", role: "", language: "en" }])}
            >
              Add
            </Button>
          }
        >
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {participants.map((p, i) => (
                <motion.li
                  key={p.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-white/[0.05] bg-ink-950/40 p-2.5">
                    <input
                      className={inputClass}
                      value={p.name}
                      onChange={(e) => updateParticipant(p.key, { name: e.target.value })}
                      placeholder={`Participant ${i + 1} name`}
                      aria-label={`Participant ${i + 1} name`}
                      maxLength={80}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      className="h-10 w-10 px-0"
                      onClick={() => removeParticipant(p.key)}
                      disabled={participants.length === 1}
                      aria-label={`Remove participant ${i + 1}`}
                    />
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <input
                        className={cn(inputClass, "h-9 text-xs")}
                        value={p.role}
                        onChange={(e) => updateParticipant(p.key, { role: e.target.value })}
                        placeholder="Role (optional)"
                        aria-label={`Participant ${i + 1} role`}
                        maxLength={80}
                      />
                      <select
                        className={cn(inputClass, "h-9 text-xs")}
                        value={p.language}
                        onChange={(e) => updateParticipant(p.key, { language: e.target.value as LanguageCode })}
                        aria-label={`Participant ${i + 1} main language`}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Panel>
      </div>

      <div className="space-y-6 xl:col-span-8">
        <Panel
          title="Transcript"
          icon={Languages}
          description="English, Bengali and Hindi lines are detected automatically"
          actions={
            <div role="tablist" aria-label="Transcript input mode" className="flex rounded-lg bg-ink-950/70 p-0.5 ring-1 ring-accent-400/15">
              {(
                [
                  ["paste", "Paste", ClipboardPaste],
                  ["lines", `Lines${filledLines ? ` · ${filledLines}` : ""}`, ListPlus],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "focus-ring relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    mode === value ? "text-ink-50" : "text-ink-400 hover:text-ink-200",
                  )}
                >
                  {mode === value && (
                    <motion.span layoutId="transcript-mode" className="absolute inset-0 rounded-md bg-accent-500/25 ring-1 ring-accent-400/40" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  <Icon className="relative size-3.5" aria-hidden />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            {mode === "paste" ? (
              <motion.div key="paste" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
                <textarea
                  data-lenis-prevent
                  className={cn(inputClass, "h-72 resize-y py-3 font-mono text-[13px] leading-relaxed")}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={"One line per turn, in the form  Name: what they said\n\nPriya: Let's launch on Friday.\nRahul: ঠিক আছে, আমি টেস্টিং শেষ করব।\nAnanya: मैं ईमेल ड्राफ्ट कर दूँगी।"}
                  aria-label="Pasted transcript"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={loadExample} className="focus-ring rounded text-xs text-electric-300 underline-offset-4 hover:underline">
                    Try an example transcript
                  </button>
                  <Button variant="primary" size="sm" icon={Wand2} onClick={() => convertPasted()} disabled={!pasted.trim()}>
                    Convert to lines
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="lines" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {lines.length === 0 ? (
                  <EmptyState
                    icon={ListPlus}
                    title="No lines yet"
                    description="Add lines one by one, or paste a whole transcript and convert it."
                    action={
                      <Button variant="primary" size="sm" icon={Plus} onClick={() => addLine()} disabled={!participants.some((p) => p.name.trim())}>
                        Add first line
                      </Button>
                    }
                  />
                ) : (
                  <ol className="space-y-2">
                    <AnimatePresence initial={false}>
                      {lines.map((line, i) => (
                        <motion.li
                          key={line.key}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="group/line flex gap-2 rounded-xl border border-white/[0.05] bg-ink-950/40 p-2.5 transition-colors focus-within:border-electric-400/30">
                            <span className="mt-2.5 w-6 shrink-0 text-right font-mono text-[11px] text-ink-500">{i + 1}</span>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  className={cn(inputClass, "h-8 w-auto! max-w-[12rem] text-xs")}
                                  value={line.speaker}
                                  onChange={(e) => updateLine(line.key, { speaker: Number(e.target.value) })}
                                  aria-label={`Line ${i + 1} speaker`}
                                >
                                  {participants.map((p, pi) => (
                                    <option key={p.key} value={p.key}>
                                      {p.name.trim() || `Participant ${pi + 1}`}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className={cn(inputClass, "h-8 w-auto! text-xs")}
                                  value={line.language}
                                  onChange={(e) => updateLine(line.key, { language: e.target.value as LanguageCode, autoLanguage: false })}
                                  aria-label={`Line ${i + 1} language`}
                                >
                                  {LANGUAGES.map((l) => (
                                    <option key={l.code} value={l.code}>
                                      {l.label}
                                    </option>
                                  ))}
                                </select>
                                {line.autoLanguage && line.text.trim() && <Badge tone="blue">auto-detected</Badge>}
                              </div>
                              <textarea
                                lang={line.language}
                                className={cn(inputClass, "h-auto min-h-16 resize-y py-2 leading-relaxed")}
                                value={line.text}
                                onChange={(e) => updateLine(line.key, { text: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    addLine(line.key);
                                  }
                                }}
                                placeholder="What did they say?"
                                aria-label={`Line ${i + 1} text`}
                                maxLength={2000}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Trash2}
                              className="mt-1 h-8 w-8 px-0 opacity-60 group-hover/line:opacity-100"
                              onClick={() => setLines((list) => list.filter((l) => l.key !== line.key))}
                              aria-label={`Remove line ${i + 1}`}
                            />
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ol>
                )}
                {lines.length > 0 && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-ink-500">Tip: Ctrl + Enter adds the next line.</p>
                    <Button size="sm" icon={Plus} onClick={() => addLine()} disabled={lines.length >= 300}>
                      Add line
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        <div className="panel flex flex-wrap items-center gap-4 p-4">
          <label className={cn("flex flex-1 cursor-pointer items-center gap-3", !aiReady && "cursor-not-allowed opacity-60")}>
            <button
              type="button"
              role="switch"
              aria-checked={translate && aiReady}
              disabled={!aiReady}
              onClick={() => setTranslate((v) => !v)}
              className={cn(
                "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
                translate && aiReady ? "btn-ai" : "bg-ink-700",
              )}
            >
              <motion.span
                className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow"
                animate={{ x: translate && aiReady ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              />
            </button>
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink-100">
                <Sparkles className="size-3.5 text-neon-300" aria-hidden /> Translate with Gemini
              </span>
              <span className="text-xs text-ink-400">
                {aiReady ? "Every line is translated into English, Bengali and Hindi." : "Gemini isn't configured on the server; lines stay in their original language."}
              </span>
            </span>
          </label>

          <AnimatePresence mode="wait">
            {saving ? (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                <AiThinking label={translate && aiReady ? `Gemini is translating ${filledLines} lines…` : "Saving to MongoDB…"} />
                {translate && aiReady && <p className="pl-11 text-[11px] text-ink-500">This can take up to a minute when Gemini is busy.</p>}
              </motion.div>
            ) : (
              <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ClickSpark sparkColor={["#22d3ee", "#8b5cf6", "#e879f9"]} sparkCount={10} sparkRadius={28} shape="star" className="inline-block">
                  <Button type="submit" variant="primary" icon={Sparkles} className="h-10 px-5">
                    Create meeting
                  </Button>
                </ClickSpark>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {errors.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full space-y-1 overflow-hidden rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200"
                role="alert"
              >
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}
