"use client";

// ---------------------------------------------------------------------------
// LoadingSpinner — simple animated loading indicator
// ---------------------------------------------------------------------------

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function LoadingSpinner({
  size = "md",
  label = "Loading…",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-4",
  }[size];

  return (
    <div className="flex items-center gap-2" role="status" aria-label={label}>
      <div
        className={`${sizeClasses} rounded-full border-white/20 border-t-cyan-400 animate-spin`}
      />
      {label && (
        <span className="text-xs text-zinc-500 font-bold">{label}</span>
      )}
    </div>
  );
}
