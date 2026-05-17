"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-green-500/50 bg-green-950/80 text-green-300",
  error:   "border-red-500/50 bg-red-950/80 text-red-300",
  info:    "border-purple-500/50 bg-purple-950/80 text-purple-300",
  warning: "border-yellow-500/50 bg-yellow-950/80 text-yellow-300",
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
  warning: "⚠️",
};

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md animate-slide-in ${TYPE_STYLES[toast.type]}`}
      style={{ minWidth: 240, maxWidth: 340 }}
      role="alert"
      aria-live="polite"
    >
      <span className="text-base shrink-0">{TYPE_ICONS[toast.type]}</span>
      <p className="flex-1 text-xs font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 flex h-5 w-5 items-center justify-center rounded text-[10px] opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
