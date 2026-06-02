"use client";

import React, { useEffect, useRef, useState } from "react";

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
  trend?: number;
  trendLabel?: string;
  /** Stagger delay in ms for fadeInUp animation */
  delay?: number;
  /** Animate numeric value from 0 to final */
  animateCount?: boolean;
}

const colorMap: Record<
  StatColor,
  { text: string; glow: string; accent: string; iconBg: string; border: string; gradientFrom: string; gradientTo: string }
> = {
  purple: {
    text:         "text-sky-700",
    glow:         "rgba(14,165,233,0.10)",
    accent:       "rgba(14,165,233,0.8)",
    iconBg:       "rgba(14,165,233,0.12)",
    border:       "rgba(14,165,233,0.20)",
    gradientFrom: "#0ea5e9",
    gradientTo:   "#06b6d4",
  },
  blue: {
    text:         "text-cyan-700",
    glow:         "rgba(6,182,212,0.10)",
    accent:       "rgba(6,182,212,0.8)",
    iconBg:       "rgba(6,182,212,0.12)",
    border:       "rgba(6,182,212,0.20)",
    gradientFrom: "#06b6d4",
    gradientTo:   "#0891b2",
  },
  green: {
    text:         "text-green-700",
    glow:         "rgba(34,197,94,0.10)",
    accent:       "rgba(34,197,94,0.8)",
    iconBg:       "rgba(34,197,94,0.12)",
    border:       "rgba(34,197,94,0.20)",
    gradientFrom: "#22c55e",
    gradientTo:   "#16a34a",
  },
  red: {
    text:         "text-red-600",
    glow:         "rgba(255,107,107,0.10)",
    accent:       "rgba(255,107,107,0.8)",
    iconBg:       "rgba(255,107,107,0.12)",
    border:       "rgba(255,107,107,0.20)",
    gradientFrom: "#FF6B6B",
    gradientTo:   "#ef4444",
  },
  yellow: {
    text:         "text-amber-600",
    glow:         "rgba(245,158,11,0.10)",
    accent:       "rgba(245,158,11,0.8)",
    iconBg:       "rgba(245,158,11,0.12)",
    border:       "rgba(245,158,11,0.20)",
    gradientFrom: "#f59e0b",
    gradientTo:   "#fbbf24",
  },
  orange: {
    text:         "text-orange-600",
    glow:         "rgba(255,140,66,0.10)",
    accent:       "rgba(255,140,66,0.8)",
    iconBg:       "rgba(255,140,66,0.12)",
    border:       "rgba(255,140,66,0.20)",
    gradientFrom: "#FF8C42",
    gradientTo:   "#f97316",
  },
  teal: {
    text:         "text-teal-700",
    glow:         "rgba(20,184,166,0.10)",
    accent:       "rgba(20,184,166,0.8)",
    iconBg:       "rgba(20,184,166,0.12)",
    border:       "rgba(20,184,166,0.20)",
    gradientFrom: "#14b8a6",
    gradientTo:   "#0d9488",
  },
  coral: {
    text:         "text-rose-600",
    glow:         "rgba(255,107,107,0.10)",
    accent:       "rgba(255,107,107,0.8)",
    iconBg:       "rgba(255,107,107,0.12)",
    border:       "rgba(255,107,107,0.20)",
    gradientFrom: "#FF6B6B",
    gradientTo:   "#FF8C42",
  },
  lime: {
    text:         "text-lime-700",
    glow:         "rgba(132,204,22,0.10)",
    accent:       "rgba(132,204,22,0.8)",
    iconBg:       "rgba(132,204,22,0.12)",
    border:       "rgba(132,204,22,0.20)",
    gradientFrom: "#84cc16",
    gradientTo:   "#65a30d",
  },
};

function useCountUp(target: number, duration = 800, delay = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const timeout = setTimeout(() => {
      const animate = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const elapsed = ts - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [target, duration, delay]);

  return count;
}

export default function StatCard({
  title,
  value,
  note,
  icon,
  color = "purple",
  className = "",
  trend,
  trendLabel,
  delay = 0,
  animateCount = true,
}: StatCardProps) {
  const cm = colorMap[color];
  const isNumeric = typeof value === "number";
  const numericTarget = isNumeric ? (value as number) : 0;
  const animatedCount = useCountUp(animateCount && isNumeric ? numericTarget : 0, 800, delay);

  const displayValue = isNumeric
    ? (animateCount ? animatedCount.toLocaleString() : numericTarget.toLocaleString())
    : value;

  return (
    <div
      className={`stat-card-premium group animate-card-entrance gpu-accelerate ${className}`}
      style={{
        background: "rgba(255,255,255,0.92)",
        border: `1px solid ${cm.border}`,
        padding: "1.25rem",
        boxShadow: `0 4px 20px rgba(0,0,0,0.05)`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Top accent line */}
      <div
        className="accent-line"
        style={{ background: `linear-gradient(90deg, ${cm.gradientFrom}, ${cm.gradientTo}, transparent)` }}
      />

      {/* Hover glow */}
      <div
        className="hover-glow"
        style={{ background: `radial-gradient(ellipse at top left, ${cm.glow}, transparent 65%)` }}
      />

      {/* Hover border glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[1.25rem] pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px ${cm.accent}28` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
            {title}
          </p>
          <p
            className={`mt-2.5 text-2xl font-black counter-number animate-stat-pop ${cm.text}`}
            style={{ letterSpacing: "-0.04em", lineHeight: 1.1, animationDelay: `${delay + 80}ms` }}
          >
            {displayValue}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {note && (
              <p className="text-[10px] text-gray-400 transition-colors duration-200 group-hover:text-gray-500">{note}</p>
            )}
            {trend !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-all duration-200 ${
                  trend > 0
                    ? "bg-green-500/10 text-green-400 border border-green-500/20 group-hover:bg-green-500/15"
                    : trend < 0
                    ? "bg-red-500/10 text-red-400 border border-red-500/20 group-hover:bg-red-500/15"
                    : "bg-white/[0.05] text-zinc-500 border border-white/[0.08]"
                }`}
              >
                {trend > 0 ? "↑" : trend < 0 ? "↓" : "—"}
                {trend !== 0 && Math.abs(trend)}
                {trendLabel && <span className="ml-0.5">{trendLabel}</span>}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div
            className="icon-wrap flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: cm.iconBg, border: `1px solid ${cm.border}` }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
