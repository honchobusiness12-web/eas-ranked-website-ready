"use client";

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Toast — success / error notification
// ---------------------------------------------------------------------------

export interface ToastMessage {
  type: "success" | "error";
  text: string;
}

interface ToastProps {
  msg: ToastMessage;
  onDismiss: () => void;
  /** Auto-dismiss after this many ms. Defaults to 4000. Pass 0 to disable. */
  autoDismissMs?: number;
}

export function Toast({ msg, onDismiss, autoDismissMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [msg, onDismiss, autoDismissMs]);

  const isSuccess = msg.type === "success";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm animate-fade-in ${
        isSuccess
          ? "border-green-400/60 bg-green-950/90 text-green-300 shadow-green-900/40"
          : "border-red-400/60 bg-red-950/90 text-red-300 shadow-red-900/40"
      }`}
    >
      <span className="text-base">{isSuccess ? "✅" : "❌"}</span>
      <span className="flex-1">{msg.text}</span>
      <button
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 transition font-black text-base"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
