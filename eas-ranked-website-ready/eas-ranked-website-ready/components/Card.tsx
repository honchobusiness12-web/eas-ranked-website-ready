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
  purple: "linear-gradient(90deg, rgba(0,207,255,0.9), rgba(77,238,234,0.6), transparent)",
  gold:   "linear-gradient(90deg, rgba(242,217,166,0.9), rgba(255,127,80,0.6), transparent)",
  blue:   "linear-gradient(90deg, rgba(0,207,255,0.9), rgba(77,238,234,0.6), transparent)",
  green:  "linear-gradient(90deg, rgba(34,197,94,0.9), rgba(77,238,234,0.5), transparent)",
  red:    "linear-gradient(90deg, rgba(255,127,80,0.9), rgba(255,140,66,0.5), transparent)",
  orange: "linear-gradient(90deg, rgba(255,127,80,0.9), rgba(242,217,166,0.5), transparent)",
  teal:   "linear-gradient(90deg, rgba(77,238,234,0.9), rgba(0,207,255,0.5), transparent)",
};

const headerGradients: Record<string, string> = {
  purple: "linear-gradient(90deg, rgba(0,207,255,0.08), transparent)",
  blue:   "linear-gradient(90deg, rgba(77,238,234,0.08), transparent)",
  green:  "linear-gradient(90deg, rgba(34,197,94,0.08), transparent)",
  red:    "linear-gradient(90deg, rgba(255,127,80,0.08), transparent)",
  orange: "linear-gradient(90deg, rgba(255,127,80,0.08), transparent)",
  teal:   "linear-gradient(90deg, rgba(77,238,234,0.08), transparent)",
  gold:   "linear-gradient(90deg, rgba(242,217,166,0.08), transparent)",
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
    ? "glass-card-premium hover:border-[rgba(0,207,255,0.45)] hover:shadow-[0_24px_72px_rgba(0,207,255,0.20),0_0_0_1px_rgba(0,207,255,0.22)] hover:-translate-y-2"
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
