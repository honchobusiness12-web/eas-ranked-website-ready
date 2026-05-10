"use client";

import { useEffect } from "react";

export interface ToastMessage {
  type: "success" | "error";
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

/**
 * Fixed-position toast notification.
 * Success toasts auto-dismiss after 4 seconds.
 * Error toasts stay until manually dismissed.
 */
export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast || toast.type !== "success") return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm animate-fade-in ${
        isSuccess
          ? "border-green-400/60 bg-green-950/90 text-green-300 shadow-green-900/40"
          : "border-red-400/60 bg-red-950/90 text-red-300 shadow-red-900/40"
      }`}
      role="alert"
      aria-live="polite"
    >
      <span className="text-lg">{isSuccess ? "✅" : "❌"}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 transition font-black text-base leading-none"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
