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
  orange: { text: "#FF7F50",  border: "rgba(255,127,80,0.28)",  bg: "rgba(255,127,80,0.12)",  glow: "#f97316" },
  purple: { text: "#00CFFF",  border: "rgba(0,207,255,0.28)",   bg: "rgba(0,207,255,0.12)",   glow: "#00CFFF" },
  green:  { text: "#4ade80",  border: "rgba(34,197,94,0.28)",   bg: "rgba(34,197,94,0.12)",   glow: "#22c55e" },
  red:    { text: "#FF7F50",  border: "rgba(255,127,80,0.28)",  bg: "rgba(255,127,80,0.12)",  glow: "#ef4444" },
  blue:   { text: "#4DEEEA",  border: "rgba(77,238,234,0.28)",  bg: "rgba(77,238,234,0.12)",  glow: "#14b8a6" },
  yellow: { text: "#fbbf24",  border: "rgba(251,191,36,0.28)",  bg: "rgba(251,191,36,0.12)",  glow: "#eab308" },
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
      className="group relative overflow-hidden rounded-xl profile-stat-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
        borderColor: c.border,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: accent ?? glowColor }}
      />
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
        style={{ background: `radial-gradient(ellipse at top left, ${c.bg}, transparent 65%)` }}
      />
      <div className="relative flex items-start justify-between mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(168,255,246,0.50)" }}>{title}</span>
      </div>
      <p
        className="relative text-2xl font-black tracking-tight tabular-nums"
        style={{ color: accent ?? c.text }}
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
        <p className="relative mt-1 text-xs truncate font-medium" style={{ color: "rgba(168,255,246,0.55)" }}>{sub}</p>
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
      className="glass-card-premium gradient-border-animated p-5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease 200ms, transform 0.5s ease 200ms",
      }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[1.5rem]"
        style={{ background: "linear-gradient(90deg, rgba(0,207,255,0.9), rgba(77,238,234,0.6), transparent)" }} />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.18), rgba(77,238,234,0.12))", border: "1px solid rgba(0,207,255,0.28)" }}>
            📈
          </div>
          <h2 className="text-sm font-black tracking-tight" style={{ color: "#e2f4ff" }}>CR Progression</h2>
        </div>
        <span className="text-xs font-medium" style={{ color: "rgba(168,255,246,0.50)" }}>
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
            className={`match-history-item flex items-center gap-2 text-xs transition-all duration-200 ${
              isWin ? "win" : isLoss ? "loss" : ""
            }`}
            style={{
              opacity: index < visibleCount ? 1 : 0,
              transform: index < visibleCount ? "translateX(0)" : "translateX(-8px)",
              transition: `opacity 0.25s ease, transform 0.25s ease`,
            }}
          >
            <span className="shrink-0">{isWin ? "✅" : isLoss ? "❌" : "➖"}</span>
            <span className="flex-1" style={{ color: isWin ? "#4ade80" : isLoss ? "#FF7F50" : "rgba(168,255,246,0.65)" }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
}
