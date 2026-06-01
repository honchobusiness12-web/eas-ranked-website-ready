import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export default function EmptyState({
  icon = "🔍",
  title,
  description,
  action,
  className = "",
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] text-center backdrop-blur-sm ${compact ? "py-10 px-5" : "py-20 px-8"} ${className}`}
      style={{
        background: "rgba(10,10,28,0.80)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04) inset",
      }}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        role="img"
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className="text-base font-black text-zinc-200">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-zinc-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
