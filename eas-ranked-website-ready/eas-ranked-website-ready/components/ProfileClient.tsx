"use client";

import { useEffect, useRef, useState } from "react";
import { InteractiveCrChart } from "@/components/InteractiveCrChart";
import type { CrPoint } from "@/lib/charts";

// ---------------------------------------------------------------------------
// Animated number counter
// ---------------------------------------------------------------------------

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (v: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 900,
  format,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const fmt = format ?? ((v: number) => v.toLocaleString());
  return <span className={className}>{fmt(display)}</span>;
}

// ---------------------------------------------------------------------------
// Animated progress bar
// ---------------------------------------------------------------------------

interface AnimatedProgressBarProps {
  pct: number;
  color: string;
  glowColor: string;
  height?: string;
}

export function AnimatedProgressBar({
  pct,
  color,
  glowColor,
  height = "h-3",
}: AnimatedProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      // Small delay so the transition fires after mount
      setTimeout(() => setWidth(pct), 60);
    });
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className={`${height} rounded-full bg-white/[0.06] overflow-hidden`}>
      <div
        className={`${height} rounded-full`}
        style={{
          width: `${width}%`,
          background: color,
          boxShadow: `0 0 8px ${glowColor}`,
          transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated stat card (wraps the static card with fade-in + counter)
// ---------------------------------------------------------------------------

interface AnimatedStatCardProps {
  icon: string;
  title: string;
  numericValue: number;
  displayValue: string;
  sub?: string;
  color: "orange" | "purple" | "green" | "red" | "blue" | "yellow";
  accent?: string;
  delay?: number;
}

const colorMap = {
  orange: { text: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/10", glow: "#f97316" },
  purple: { text: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/10", glow: "#a855f7" },
  green:  { text: "text-green-400",  border: "border-green-500/20",  bg: "bg-green-500/10",  glow: "#22c55e" },
  red:    { text: "text-red-400",    border: "border-red-500/20",    bg: "bg-red-500/10",    glow: "#ef4444" },
  blue:   { text: "text-teal-400",   border: "border-teal-500/20",   bg: "bg-teal-500/10",   glow: "#14b8a6" },
  yellow: { text: "text-yellow-400", border: "border-yellow-500/20", bg: "bg-yellow-500/10", glow: "#eab308" },
};

export function AnimatedStatCard({
  icon,
  title,
  numericValue,
  displayValue,
  sub,
  color = "orange",
  accent,
  delay = 0,
}: AnimatedStatCardProps) {
  const c = colorMap[color];
  const glowColor = accent ?? c.glow;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  // Detect if value is a percentage string like "72%"
  const isPct = displayValue.endsWith("%");
  const isDecimal = displayValue.includes(".");

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-[#0d0d18] px-4 py-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${c.border}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms, box-shadow 0.2s ease, scale 0.2s ease`,
        boxShadow: `0 0 0 0 ${glowColor}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${glowColor}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-50 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: glowColor }}
      />
      <div className="flex items-start justify-between mb-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${c.bg}`}>
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{title}</span>
      </div>
      <p
        className={`text-2xl font-black tracking-tight tabular-nums ${c.text}`}
        style={accent ? { color: accent } : {}}
      >
        {isPct ? (
          <>
            <AnimatedNumber value={numericValue} duration={800} />
            <span>%</span>
          </>
        ) : isDecimal ? (
          displayValue
        ) : (
          <AnimatedNumber value={numericValue} duration={800} />
        )}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10px] text-zinc-600 truncate font-medium">{sub}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CR Progression section (client wrapper for the interactive chart)
// ---------------------------------------------------------------------------

interface CrProgressionSectionProps {
  crPoints: CrPoint[];
}

export function CrProgressionSection({ crPoints }: CrProgressionSectionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease 200ms, transform 0.5s ease 200ms",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black tracking-tight">📈 CR Progression</h2>
        <span className="text-xs text-zinc-600 font-medium">
          Last {Math.min(crPoints.length, 20)} matches
        </span>
      </div>
      <InteractiveCrChart points={crPoints} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated achievement progress bar
// ---------------------------------------------------------------------------

interface AchievementProgressProps {
  unlocked: number;
  total: number;
}

export function AchievementProgress({ unlocked, total }: AchievementProgressProps) {
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(id);
  }, [pct]);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${width}%`,
            background: "linear-gradient(90deg, #f97316, #eab308)",
            boxShadow: "0 0 6px rgba(249,115,22,0.4)",
            transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      <span className="rounded-lg border border-orange-600/30 bg-orange-950/20 px-2.5 py-1 text-xs font-bold text-orange-300">
        {unlocked} / {total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated match history list
// ---------------------------------------------------------------------------

interface MatchHistoryListProps {
  history: string[];
}

export function MatchHistoryList({ history }: MatchHistoryListProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const items = history.slice(-20).reverse();

  useEffect(() => {
    let i = 0;
    const tick = () => {
      i++;
      setVisibleCount(i);
      if (i < items.length) {
        setTimeout(tick, 30);
      }
    };
    const id = setTimeout(tick, 100);
    return () => clearTimeout(id);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-2xl">📭</span>
        <p className="text-xs text-zinc-600">No match history saved yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
      {items.map((item: string, index: number) => {
        const isWin = item.toLowerCase().includes("win") || item.includes("+");
        const isLoss = item.toLowerCase().includes("loss") || item.includes("-");
        return (
          <div
            key={index}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border transition-all duration-200 hover:scale-[1.01] ${
              isWin
                ? "border-green-800/20 bg-green-950/15 text-green-300"
                : isLoss
                ? "border-red-800/20 bg-red-950/15 text-red-300"
                : "border-white/[0.05] bg-white/[0.03] text-zinc-400"
            }`}
            style={{
              opacity: index < visibleCount ? 1 : 0,
              transform: index < visibleCount ? "translateX(0)" : "translateX(-8px)",
              transition: `opacity 0.25s ease, transform 0.25s ease`,
            }}
          >
            <span className="shrink-0">{isWin ? "✅" : isLoss ? "❌" : "➖"}</span>
            <span className="flex-1">{item}</span>
          </div>
        );
      })}
    </div>
  );
}
