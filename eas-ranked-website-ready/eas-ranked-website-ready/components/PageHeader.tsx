import React from "react";

interface PageHeaderProps {
  icon?: string;
  title: string;
  description?: string;
  /** Slot for action buttons on the right */
  actions?: React.ReactNode;
  /** Accent colour for the icon background */
  iconAccent?: "purple" | "blue" | "gold" | "green" | "red" | "teal" | "orange";
  className?: string;
  /** Optional badge/pill next to the title */
  badge?: React.ReactNode;
}

const iconAccentMap: Record<string, { bg: string; border: string; glow: string }> = {
  purple: { bg: "rgba(168,85,247,0.14)", border: "rgba(168,85,247,0.28)", glow: "rgba(168,85,247,0.08)" },
  blue:   { bg: "rgba(79,142,247,0.14)",  border: "rgba(79,142,247,0.28)",  glow: "rgba(79,142,247,0.08)" },
  gold:   { bg: "rgba(255,215,0,0.14)",   border: "rgba(255,215,0,0.28)",   glow: "rgba(255,215,0,0.08)" },
  green:  { bg: "rgba(34,197,94,0.14)",   border: "rgba(34,197,94,0.28)",   glow: "rgba(34,197,94,0.08)" },
  red:    { bg: "rgba(239,68,68,0.14)",   border: "rgba(239,68,68,0.28)",   glow: "rgba(239,68,68,0.08)" },
  teal:   { bg: "rgba(6,182,212,0.14)",   border: "rgba(6,182,212,0.28)",   glow: "rgba(6,182,212,0.08)" },
  orange: { bg: "rgba(249,115,22,0.14)",  border: "rgba(249,115,22,0.28)",  glow: "rgba(249,115,22,0.08)" },
};

export default function PageHeader({
  icon,
  title,
  description,
  actions,
  iconAccent = "purple",
  className = "",
  badge,
}: PageHeaderProps) {
  const accent = iconAccentMap[iconAccent];

  return (
    <div className={`mb-7 flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3.5">
        {icon && (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl transition-transform duration-200 hover:scale-105"
            style={{
              background: accent.bg,
              border: `1px solid ${accent.border}`,
              boxShadow: `0 0 20px ${accent.glow}`,
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-white leading-none">{title}</h1>
            {badge && badge}
          </div>
          {description && (
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-xl">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
