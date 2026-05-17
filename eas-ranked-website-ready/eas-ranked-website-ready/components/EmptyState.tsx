import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon = "🔍",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] py-20 px-6 text-center backdrop-blur-sm ${className}`}
      style={{ background: "rgba(9,9,25,0.85)" }}
    >
      <p className="text-5xl mb-4" role="img" aria-hidden="true">
        {icon}
      </p>
      <p className="text-base font-black text-zinc-300">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-zinc-600 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
