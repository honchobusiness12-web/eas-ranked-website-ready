import React from "react";

type StatColor =
  | "purple"
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "orange"
  | "teal"
  | "coral"
  | "lime";

interface StatCardProps {
  title: string;
  value: string | number;
  note?: string;
  icon?: string;
  color?: StatColor;
  className?: string;
}

const colorMap: Record<
  StatColor,
  { text: string; glow: string; accent: string; iconBg: string }
> = {
  purple: {
    text:   "text-purple-400",
    glow:   "rgba(192,132,252,0.12)",
    accent: "rgba(192,132,252,0.7)",
    iconBg: "rgba(192,132,252,0.12)",
  },
  blue: {
    text:   "text-blue-400",
    glow:   "rgba(96,165,250,0.12)",
    accent: "rgba(96,165,250,0.7)",
    iconBg: "rgba(96,165,250,0.12)",
  },
  green: {
    text:   "text-green-400",
    glow:   "rgba(74,222,128,0.12)",
    accent: "rgba(74,222,128,0.7)",
    iconBg: "rgba(74,222,128,0.12)",
  },
  red: {
    text:   "text-red-400",
    glow:   "rgba(248,113,113,0.12)",
    accent: "rgba(248,113,113,0.7)",
    iconBg: "rgba(248,113,113,0.12)",
  },
  yellow: {
    text:   "text-yellow-400",
    glow:   "rgba(250,204,21,0.12)",
    accent: "rgba(250,204,21,0.7)",
    iconBg: "rgba(250,204,21,0.12)",
  },
  orange: {
    text:   "text-orange-400",
    glow:   "rgba(251,146,60,0.12)",
    accent: "rgba(251,146,60,0.7)",
    iconBg: "rgba(251,146,60,0.12)",
  },
  teal: {
    text:   "text-cyan-400",
    glow:   "rgba(34,211,238,0.12)",
    accent: "rgba(34,211,238,0.7)",
    iconBg: "rgba(34,211,238,0.12)",
  },
  coral: {
    text:   "text-red-400",
    glow:   "rgba(248,113,113,0.12)",
    accent: "rgba(248,113,113,0.7)",
    iconBg: "rgba(248,113,113,0.12)",
  },
  lime: {
    text:   "text-green-400",
    glow:   "rgba(74,222,128,0.12)",
    accent: "rgba(74,222,128,0.7)",
    iconBg: "rgba(74,222,128,0.12)",
  },
};

export default function StatCard({
  title,
  value,
  note,
  icon,
  color = "purple",
  className = "",
}: StatCardProps) {
  const cm = colorMap[color];
  const displayValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.10] hover:scale-[1.02] hover:-translate-y-0.5 ${className}`}
      style={{ background: "rgba(9,9,25,0.85)" }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-50 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: cm.accent }}
      />
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top, ${cm.glow}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            {title}
          </p>
          <p
            className={`mt-1.5 text-2xl font-black tracking-tight ${cm.text}`}
            style={{ letterSpacing: "-0.03em" }}
          >
            {displayValue}
          </p>
          {note && (
            <p className="mt-0.5 text-[10px] text-zinc-700">{note}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
            style={{ background: cm.iconBg }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
