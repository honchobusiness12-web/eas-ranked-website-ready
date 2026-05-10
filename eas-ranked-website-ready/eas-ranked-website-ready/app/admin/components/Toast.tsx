"use client";

import { useEffect } from "react";

export interface ToastMessage {
  type: "success" | "error";
  text: string;
}

interface ToastProps {
  msg: ToastMessage;
  onDismiss: () => void;
  /** Auto-dismiss after ms. Defaults to 5000. Pass 0 to disable. */
  autoDismissMs?: number;
}

export default function Toast({ msg, onDismiss, autoDismissMs = 5000 }: ToastProps) {
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [msg, onDismiss, autoDismissMs]);

  const isSuccess = msg.type === "success";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-bold shadow-2xl max-w-sm ${
        isSuccess
          ? "border-green-500/60 bg-green-950/95 text-green-300 shadow-green-900/40"
          : "border-red-500/60 bg-red-950/95 text-red-300 shadow-red-900/40"
      }`}
    >
      <span className="text-base">{isSuccess ? "✅" : "❌"}</span>
      <span className="flex-1 leading-snug">{msg.text}</span>
      <button
        onClick={onDismiss}
        className="ml-1 shrink-0 opacity-50 hover:opacity-100 transition text-base font-black"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
