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
  /** Stagger delay in ms for fadeInUp animation */
  delay?: number;
  /** Disable entrance animation */
  noAnimation?: boolean;
}

const accentColors: Record<string, string> = {
  purple: "linear-gradient(90deg, rgba(0,207,255,0.90), rgba(77,238,234,0.65), transparent)",
  gold:   "linear-gradient(90deg, rgba(255,127,80,0.90), rgba(242,217,166,0.65), transparent)",
  blue:   "linear-gradient(90deg, rgba(77,238,234,0.90), rgba(0,207,255,0.65), transparent)",
  green:  "linear-gradient(90deg, rgba(74,222,128,0.90), rgba(77,238,234,0.55), transparent)",
  red:    "linear-gradient(90deg, rgba(255,127,80,0.90), rgba(255,140,66,0.55), transparent)",
  orange: "linear-gradient(90deg, rgba(255,140,66,0.90), rgba(242,217,166,0.55), transparent)",
  teal:   "linear-gradient(90deg, rgba(77,238,234,0.90), rgba(0,207,255,0.55), transparent)",
};

const headerGradients: Record<string, string> = {
  purple: "linear-gradient(90deg, rgba(0,207,255,0.09), transparent)",
  blue:   "linear-gradient(90deg, rgba(77,238,234,0.09), transparent)",
  green:  "linear-gradient(90deg, rgba(74,222,128,0.09), transparent)",
  red:    "linear-gradient(90deg, rgba(255,127,80,0.09), transparent)",
  orange: "linear-gradient(90deg, rgba(255,140,66,0.09), transparent)",
  teal:   "linear-gradient(90deg, rgba(77,238,234,0.09), transparent)",
  gold:   "linear-gradient(90deg, rgba(242,217,166,0.09), transparent)",
};

export default function Card({
  children,
  className = "",
  hoverable = false,
  accent,
  as: Tag = "div",
  style,
  delay = 0,
  noAnimation = false,
}: CardProps) {
  const hoverClasses = hoverable
    ? "glass-card-premium hover:-translate-y-1"
    : "glass-card-premium";

  const animClass = noAnimation ? "" : "animate-card-entrance";

  return (
    <Tag
      className={`relative overflow-hidden ${hoverClasses} ${animClass} ${className}`}
      style={{
        animationDelay: noAnimation ? undefined : `${delay}ms`,
        ...style,
      }}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[1.25rem] transition-all duration-300 opacity-70 group-hover:opacity-100 group-hover:h-[3px]"
          style={{ background: accentColors[accent] }}
        />
      )}
      {children}
    </Tag>
  );
}
