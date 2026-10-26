"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { cn, copyToClipboard } from "@/lib/utils";

export function CopyButton({
  getText,
  label,
  successMessage = "Copied to clipboard",
  disabled,
  className,
}: {
  getText: () => string;
  label: string;
  successMessage?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(getText());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      notify(successMessage);
    } else {
      notify("Copy failed", { tone: "warning", description: "Your browser blocked clipboard access." });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-emerald-300" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
