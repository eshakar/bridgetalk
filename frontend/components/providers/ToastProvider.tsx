"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "warning";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (title: string, options?: { description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle } as const;
const TONES: Record<ToastTone, string> = {
  success: "text-emerald-300",
  info: "text-sky-300",
  warning: "text-amber-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), []);

  const notify = useCallback<ToastContextValue["notify"]>(
    (title, options) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, title, description: options?.description, tone: options?.tone ?? "success" }]);
      setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className="toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-ink-700 bg-ink-850/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur"
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[toast.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-100">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="focus-ring -mr-1 rounded-md p-1 text-ink-400 hover:text-ink-100"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
