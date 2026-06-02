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
  { textColor: string; glow: string; accent: string; iconBg: string; border: string; gradientFrom: string; gradientTo: string }
> = {
  purple: {
    textColor:    "#00CFFF",
    glow:         "rgba(0,207,255,0.12)",
    accent:       "rgba(0,207,255,0.85)",
    iconBg:       "rgba(0,207,255,0.14)",
    border:       "rgba(0,207,255,0.22)",
    gradientFrom: "#00CFFF",
    gradientTo:   "#4DEEEA",
  },
  blue: {
    textColor:    "#4DEEEA",
    glow:         "rgba(77,238,234,0.12)",
    accent:       "rgba(77,238,234,0.85)",
    iconBg:       "rgba(77,238,234,0.14)",
    border:       "rgba(77,238,234,0.22)",
    gradientFrom: "#4DEEEA",
    gradientTo:   "#00CFFF",
  },
  green: {
    textColor:    "#4ade80",
    glow:         "rgba(74,222,128,0.12)",
    accent:       "rgba(74,222,128,0.85)",
    iconBg:       "rgba(74,222,128,0.14)",
    border:       "rgba(74,222,128,0.22)",
    gradientFrom: "#22c55e",
    gradientTo:   "#4ade80",
  },
  red: {
    textColor:    "#FF7F50",
    glow:         "rgba(255,127,80,0.12)",
    accent:       "rgba(255,127,80,0.85)",
    iconBg:       "rgba(255,127,80,0.14)",
    border:       "rgba(255,127,80,0.22)",
    gradientFrom: "#FF7F50",
    gradientTo:   "#FF8C42",
  },
  yellow: {
    textColor:    "#F2D9A6",
    glow:         "rgba(242,217,166,0.12)",
    accent:       "rgba(242,217,166,0.85)",
    iconBg:       "rgba(242,217,166,0.14)",
    border:       "rgba(242,217,166,0.22)",
    gradientFrom: "#F2D9A6",
    gradientTo:   "#fbbf24",
  },
  orange: {
    textColor:    "#FF8C42",
    glow:         "rgba(255,140,66,0.12)",
    accent:       "rgba(255,140,66,0.85)",
    iconBg:       "rgba(255,140,66,0.14)",
    border:       "rgba(255,140,66,0.22)",
    gradientFrom: "#FF8C42",
    gradientTo:   "#FF7F50",
  },
  teal: {
    textColor:    "#A8FFF6",
    glow:         "rgba(168,255,246,0.12)",
    accent:       "rgba(168,255,246,0.85)",
    iconBg:       "rgba(168,255,246,0.14)",
    border:       "rgba(168,255,246,0.22)",
    gradientFrom: "#A8FFF6",
    gradientTo:   "#4DEEEA",
  },
  coral: {
    textColor:    "#FF7F50",
    glow:         "rgba(255,127,80,0.12)",
    accent:       "rgba(255,127,80,0.85)",
    iconBg:       "rgba(255,127,80,0.14)",
    border:       "rgba(255,127,80,0.22)",
    gradientFrom: "#FF7F50",
    gradientTo:   "#FF8C42",
  },
  lime: {
    textColor:    "#A8FFF6",
    glow:         "rgba(168,255,246,0.12)",
    accent:       "rgba(168,255,246,0.85)",
    iconBg:       "rgba(168,255,246,0.14)",
    border:       "rgba(168,255,246,0.22)",
    gradientFrom: "#A8FFF6",
    gradientTo:   "#4DEEEA",
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
        background: "rgba(6,43,69,0.82)",
        border: `1px solid ${cm.border}`,
        padding: "1.5rem",
        boxShadow: `0 8px 32px rgba(0,0,0,0.28)`,
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
        style={{ boxShadow: `inset 0 0 0 1px ${cm.accent}40` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest leading-none" style={{ color: "rgba(168,255,246,0.55)" }}>
            {title}
          </p>
          <p
            className="mt-3 text-3xl font-black counter-number animate-stat-pop"
            style={{ letterSpacing: "-0.04em", lineHeight: 1.1, animationDelay: `${delay + 80}ms`, color: cm.textColor }}
          >
            {displayValue}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {note && (
              <p className="text-[10px] transition-colors duration-200" style={{ color: "rgba(168,255,246,0.45)" }}>{note}</p>
            )}
            {trend !== undefined && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-all duration-200"
                style={
                  trend > 0
                    ? { background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }
                    : trend < 0
                    ? { background: "rgba(255,127,80,0.12)", color: "#FF7F50", border: "1px solid rgba(255,127,80,0.25)" }
                    : { background: "rgba(168,255,246,0.06)", color: "rgba(168,255,246,0.5)", border: "1px solid rgba(168,255,246,0.12)" }
                }
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
            className="icon-wrap flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: cm.iconBg, border: `1px solid ${cm.border}`, boxShadow: `0 0 16px ${cm.glow}` }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
