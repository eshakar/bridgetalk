"use client";

import { motion } from "motion/react";

/** Orbiting "neural" loader shown while the model is working. */
export function AiThinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="status">
      <span className="relative grid size-8 place-items-center" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-[image:var(--ai-gradient)] opacity-40 blur-md" />
        <motion.span
          className="absolute inset-0 rounded-full border border-transparent border-t-electric-400 border-r-neon-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          className="size-2.5 rounded-full bg-white shadow-[0_0_12px_#fff]"
          animate={{ scale: [1, 1.6, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
      <span className="text-ai text-xs font-medium">{label}</span>
    </div>
  );
}

/** Reveals text word by word, like a streamed model response. */
export function StreamText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <p className={className} aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={`${i}-${word}`}
          aria-hidden
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.02, 1.2), duration: 0.28, ease: "easeOut" }}
          className="inline-block whitespace-pre"
        >
          {word + (i < words.length - 1 ? " " : "")}
        </motion.span>
      ))}
    </p>
  );
}
