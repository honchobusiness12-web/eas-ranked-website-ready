import React from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-red-500/[0.18] py-16 px-8 text-center backdrop-blur-sm ${className}`}
      style={{
        background: "rgba(127,29,29,0.08)",
        boxShadow: "0 4px 24px rgba(239,68,68,0.08)",
      }}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}
        role="img"
        aria-hidden="true"
      >
        ⚠️
      </div>
      <p className="text-base font-black text-red-300">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-zinc-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
