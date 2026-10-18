"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "danger";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Toasts auto-dismiss after this long (hover keeps them open). */
const DURATION_MS = 4_000;

const toneStyle: Record<ToastTone, { box: string; icon: string; Icon: typeof CheckCircle2 }> = {
  success: { box: "border-success/40", icon: "text-success", Icon: CheckCircle2 },
  danger: { box: "border-danger/40", icon: "text-danger", Icon: AlertTriangle },
};

/** Provides useToast() and renders the stack in the bottom-right corner. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const api = useMemo<ToastApi>(() => {
    const push = (tone: ToastTone, title: string, description?: string) =>
      setToasts((list) => [...list.slice(-3), { id: nextId.current++, tone, title, description }]);
    return {
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("danger", title, description),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 print:hidden"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const { box, icon, Icon } = toneStyle[toast.tone];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [paused, toast.id, onDismiss]);

  return (
    <div
      role={toast.tone === "danger" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`animate-fade-up pointer-events-auto flex items-start gap-3 rounded-md border bg-surface p-4 text-sm shadow-soft ${box}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-semibold text-fg">{toast.title}</p>
        {toast.description && <p className="text-muted">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="cursor-pointer rounded-md p-0.5 text-muted transition-colors hover:text-fg"
        aria-label="বন্ধ করুন"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
