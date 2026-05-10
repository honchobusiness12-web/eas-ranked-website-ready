"use client";

interface LoadingSpinnerProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({
  text = "Loading…",
  size = "md",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  return (
    <div className={`flex items-center gap-2 text-zinc-400 animate-pulse ${sizeClasses}`}>
      <span className="animate-spin inline-block">⟳</span>
      <span>{text}</span>
    </div>
  );
}
