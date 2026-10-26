"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, CircleAlert, MessageSquareText, ShieldCheck, Sparkles, Trash2, WifiOff } from "lucide-react";
import { AiThinking, StreamText } from "@/components/effects/AiThinking";
import { useMeeting, type QAEntry } from "@/components/providers/MeetingProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { SourceChips } from "@/components/ui/SourceChips";

const DEMO_SUGGESTIONS = [
  "Who is fixing the payment bugs?",
  "What did the team decide?",
  "Will premium features be free?",
  "When is the launch date?",
];

const GENERAL_SUGGESTIONS = [
  "What was decided?",
  "Who owns which tasks?",
  "Were any deadlines mentioned?",
  "What is still unresolved?",
];

const MAX_LENGTH = 500;

function Answer({ entry }: { entry: QAEntry }) {
  if (entry.status === "loading" || !entry.result) {
    return <AiThinking label="Searching the transcript…" />;
  }
  const { result, origin } = entry;
  return (
    <div className="fade-in space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {result.grounded ? (
          <Badge tone="green" icon={ShieldCheck}>
            Grounded in transcript
          </Badge>
        ) : (
          <Badge tone="amber" icon={CircleAlert}>
            Not covered by the meeting
          </Badge>
        )}
        {origin === "local" ? (
          <Badge icon={WifiOff}>Offline</Badge>
        ) : (
          <Badge tone={result.mode === "gemini" ? "violet" : "neutral"} icon={result.mode === "gemini" ? Sparkles : undefined}>
            {result.mode === "gemini" ? "Gemini" : "Rules engine"}
          </Badge>
        )}
      </div>
      <StreamText text={result.answer} className="text-sm leading-relaxed text-ink-200" />
      <div className="flex items-center justify-between gap-2">
        <SourceChips ids={result.source_segment_ids} label={result.grounded ? "Sources" : "Related"} />
        <CopyButton getText={() => result.answer} label="Copy answer" successMessage="Answer copied" className="ml-auto" />
      </div>
    </div>
  );
}

export function MeetingQA() {
  const { qaEntries, ask, clearQuestions, isDemo } = useMeeting();
  const suggestions = isDemo ? DEMO_SUGGESTIONS : GENERAL_SUGGESTIONS;
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const busy = qaEntries.some((entry) => entry.status === "loading");

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [qaEntries]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setError("Type a question about the meeting first.");
      return;
    }
    setError(null);
    setQuestion("");
    void ask(trimmed.slice(0, MAX_LENGTH));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(question);
  }

  return (
    <Panel
      title="Ask this meeting"
      icon={MessageSquareText}
      description="Answers cite the transcript, or say when it has no answer"
      actions={
        qaEntries.length > 0 && (
          <Button variant="ghost" size="sm" icon={Trash2} onClick={clearQuestions} disabled={busy}>
            Clear
          </Button>
        )
      }
      bodyClassName="flex flex-col gap-4"
    >
      {qaEntries.length === 0 ? (
        <div>
          <p className="text-xs text-ink-400">Try one of these:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={suggestion}
                type="button"
                onClick={() => submit(suggestion)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="focus-ring rounded-full border border-accent-400/25 bg-ink-900/60 px-3 py-1.5 text-xs text-ink-200 transition-colors hover:border-electric-400/60 hover:text-ink-50 hover:shadow-[0_0_16px_-4px_rgb(34_211_238/0.6)]"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={listRef} data-lenis-prevent className="scroll-panel max-h-[420px] space-y-4 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
          <AnimatePresence initial={false}>
            {qaEntries.map((entry) => (
              <motion.div key={entry.id} className="space-y-2.5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-accent-500/30 to-electric-500/20 px-3.5 py-2 text-sm text-ink-50 ring-1 ring-accent-400/30">
                    {entry.question}
                  </p>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="ai-ring rounded-2xl rounded-bl-md bg-ink-900/60 px-3.5 py-3"
                >
                  <Answer entry={entry} />
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-auto">
        <label htmlFor="meeting-question" className="sr-only">
          Ask a question about this meeting
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-accent-400/20 bg-ink-900/80 p-1.5 pl-3.5 transition-all focus-within:border-electric-400/60 focus-within:shadow-[0_0_24px_-6px_rgb(34_211_238/0.5)]">
          <input
            id="meeting-question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              if (error) setError(null);
            }}
            maxLength={MAX_LENGTH}
            placeholder="Ask Gemini about decisions, owners, deadlines…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "question-error" : undefined}
            autoComplete="off"
          />
          <Button type="submit" variant="primary" size="sm" disabled={busy} aria-label="Ask question" className="size-8 px-0">
            <ArrowUp className="size-4" aria-hidden />
          </Button>
        </div>
        {error && (
          <p id="question-error" className="mt-1.5 text-xs text-amber-300">
            {error}
          </p>
        )}
      </form>
    </Panel>
  );
}
