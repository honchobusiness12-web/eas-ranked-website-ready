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
}

const iconAccentMap: Record<string, string> = {
  purple: "rgba(168,85,247,0.15)",
  blue:   "rgba(79,142,247,0.15)",
  gold:   "rgba(255,215,0,0.15)",
  green:  "rgba(74,222,128,0.15)",
  red:    "rgba(248,113,113,0.15)",
  teal:   "rgba(0,212,255,0.15)",
  orange: "rgba(251,146,60,0.15)",
};

export default function PageHeader({
  icon,
  title,
  description,
  actions,
  iconAccent = "purple",
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl"
            style={{
              background: iconAccentMap[iconAccent],
              border: `1px solid ${iconAccentMap[iconAccent].replace("0.15", "0.3")}`,
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
          {description && (
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
