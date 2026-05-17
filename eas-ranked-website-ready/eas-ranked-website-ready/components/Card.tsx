import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle hover lift + border brightening */
  hoverable?: boolean;
  /** Adds a coloured top accent line */
  accent?: "purple" | "gold" | "blue" | "green" | "red" | "orange" | "teal";
  /** Renders as a different HTML element */
  as?: "div" | "section" | "article";
  style?: React.CSSProperties;
}

const accentColors: Record<string, string> = {
  purple: "linear-gradient(90deg, rgba(168,85,247,0.9), rgba(79,142,247,0.7), transparent)",
  gold:   "linear-gradient(90deg, rgba(255,215,0,0.9), rgba(255,159,67,0.7), transparent)",
  blue:   "linear-gradient(90deg, rgba(79,142,247,0.9), rgba(0,212,255,0.7), transparent)",
  green:  "linear-gradient(90deg, rgba(74,222,128,0.9), rgba(0,212,255,0.5), transparent)",
  red:    "linear-gradient(90deg, rgba(248,113,113,0.9), rgba(251,146,60,0.5), transparent)",
  orange: "linear-gradient(90deg, rgba(251,146,60,0.9), rgba(250,204,21,0.6), transparent)",
  teal:   "linear-gradient(90deg, rgba(0,212,255,0.9), rgba(79,142,247,0.6), transparent)",
};

export default function Card({
  children,
  className = "",
  hoverable = false,
  accent,
  as: Tag = "div",
  style,
}: CardProps) {
  const hoverClasses = hoverable
    ? "transition-all duration-200 hover:border-white/[0.12] hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    : "";

  return (
    <Tag
      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm ${hoverClasses} ${className}`}
      style={{ background: "rgba(9,9,25,0.85)", ...style }}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
          style={{ background: accentColors[accent] }}
        />
      )}
      {children}
    </Tag>
  );
}
