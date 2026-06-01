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
  /** Optional header section with gradient */
  headerGradient?: "purple" | "blue" | "green" | "red" | "orange" | "teal" | "gold";
}

const accentColors: Record<string, string> = {
  purple: "linear-gradient(90deg, rgba(168,85,247,0.9), rgba(79,142,247,0.6), transparent)",
  gold:   "linear-gradient(90deg, rgba(255,215,0,0.9), rgba(255,159,67,0.6), transparent)",
  blue:   "linear-gradient(90deg, rgba(79,142,247,0.9), rgba(6,182,212,0.6), transparent)",
  green:  "linear-gradient(90deg, rgba(34,197,94,0.9), rgba(6,182,212,0.5), transparent)",
  red:    "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(251,146,60,0.5), transparent)",
  orange: "linear-gradient(90deg, rgba(249,115,22,0.9), rgba(250,204,21,0.5), transparent)",
  teal:   "linear-gradient(90deg, rgba(6,182,212,0.9), rgba(79,142,247,0.5), transparent)",
};

const headerGradients: Record<string, string> = {
  purple: "linear-gradient(90deg, rgba(124,58,237,0.09), transparent)",
  blue:   "linear-gradient(90deg, rgba(79,142,247,0.09), transparent)",
  green:  "linear-gradient(90deg, rgba(34,197,94,0.09), transparent)",
  red:    "linear-gradient(90deg, rgba(239,68,68,0.09), transparent)",
  orange: "linear-gradient(90deg, rgba(249,115,22,0.09), transparent)",
  teal:   "linear-gradient(90deg, rgba(6,182,212,0.09), transparent)",
  gold:   "linear-gradient(90deg, rgba(255,215,0,0.09), transparent)",
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
    ? "transition-all duration-200 hover:border-white/[0.11] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    : "";

  return (
    <Tag
      className={`relative overflow-hidden rounded-2xl border border-white/[0.07] backdrop-blur-sm ${hoverClasses} ${className}`}
      style={{
        background: "rgba(10,10,28,0.85)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
        ...style,
      }}
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
