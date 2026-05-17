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
      className={`flex flex-col items-center justify-center rounded-2xl border border-red-700/30 bg-red-950/10 py-16 px-6 text-center ${className}`}
    >
      <p className="text-5xl mb-4" role="img" aria-hidden="true">
        ⚠️
      </p>
      <p className="text-base font-black text-red-300">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-zinc-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
