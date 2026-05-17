import React from "react";

type BadgeVariant =
  | "default"
  | "purple"
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "orange"
  | "teal"
  | "gold";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "xs" | "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-zinc-700/50 bg-zinc-800/60 text-zinc-400",
  purple:  "border-purple-500/30 bg-purple-500/15 text-purple-300",
  blue:    "border-blue-500/30 bg-blue-500/15 text-blue-300",
  green:   "border-green-500/30 bg-green-500/15 text-green-300",
  red:     "border-red-500/30 bg-red-500/15 text-red-300",
  yellow:  "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
  orange:  "border-orange-500/30 bg-orange-500/15 text-orange-300",
  teal:    "border-teal-500/30 bg-teal-500/15 text-teal-300",
  gold:    "border-yellow-400/40 bg-yellow-500/15 text-yellow-300",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-zinc-500",
  purple:  "bg-purple-400",
  blue:    "bg-blue-400",
  green:   "bg-green-400",
  red:     "bg-red-400",
  yellow:  "bg-yellow-400",
  orange:  "bg-orange-400",
  teal:    "bg-teal-400",
  gold:    "bg-yellow-400",
};

const sizeClasses = {
  xs: "px-1.5 py-0.5 text-[9px] gap-1",
  sm: "px-2.5 py-0.5 text-[10px] gap-1",
  md: "px-3 py-1 text-xs gap-1.5",
};

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wider ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
