"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
};

/**
 * Inline loading spinner with optional label.
 */
export default function LoadingSpinner({
  size = "md",
  label,
}: LoadingSpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${sizeMap[size]}`}>
      <span className="animate-spin inline-block">⟳</span>
      {label && (
        <span className="text-zinc-400 font-bold animate-pulse">{label}</span>
      )}
    </span>
  );
}
