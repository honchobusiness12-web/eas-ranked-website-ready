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
    text:         "text-purple-300",
    glow:         "rgba(168,85,247,0.10)",
    accent:       "rgba(168,85,247,0.8)",
    iconBg:       "rgba(168,85,247,0.14)",
    border:       "rgba(168,85,247,0.18)",
    gradientFrom: "#7C3AED",
    gradientTo:   "#A855F7",
  },
  blue: {
    text:         "text-blue-300",
    glow:         "rgba(79,142,247,0.10)",
    accent:       "rgba(79,142,247,0.8)",
    iconBg:       "rgba(79,142,247,0.14)",
    border:       "rgba(79,142,247,0.18)",
    gradientFrom: "#3B82F6",
    gradientTo:   "#60A5FA",
  },
  green: {
    text:         "text-green-300",
    glow:         "rgba(34,197,94,0.10)",
    accent:       "rgba(34,197,94,0.8)",
    iconBg:       "rgba(34,197,94,0.14)",
    border:       "rgba(34,197,94,0.18)",
    gradientFrom: "#16A34A",
    gradientTo:   "#4ADE80",
  },
  red: {
    text:         "text-red-300",
    glow:         "rgba(239,68,68,0.10)",
    accent:       "rgba(239,68,68,0.8)",
    iconBg:       "rgba(239,68,68,0.14)",
    border:       "rgba(239,68,68,0.18)",
    gradientFrom: "#DC2626",
    gradientTo:   "#F87171",
  },
  yellow: {
    text:         "text-yellow-300",
    glow:         "rgba(234,179,8,0.10)",
    accent:       "rgba(234,179,8,0.8)",
    iconBg:       "rgba(234,179,8,0.14)",
    border:       "rgba(234,179,8,0.18)",
    gradientFrom: "#CA8A04",
    gradientTo:   "#FDE047",
  },
  orange: {
    text:         "text-orange-300",
    glow:         "rgba(249,115,22,0.10)",
    accent:       "rgba(249,115,22,0.8)",
    iconBg:       "rgba(249,115,22,0.14)",
    border:       "rgba(249,115,22,0.18)",
    gradientFrom: "#EA580C",
    gradientTo:   "#FB923C",
  },
  teal: {
    text:         "text-cyan-300",
    glow:         "rgba(6,182,212,0.10)",
    accent:       "rgba(6,182,212,0.8)",
    iconBg:       "rgba(6,182,212,0.14)",
    border:       "rgba(6,182,212,0.18)",
    gradientFrom: "#0891B2",
    gradientTo:   "#22D3EE",
  },
  coral: {
    text:         "text-rose-300",
    glow:         "rgba(244,63,94,0.10)",
    accent:       "rgba(244,63,94,0.8)",
    iconBg:       "rgba(244,63,94,0.14)",
    border:       "rgba(244,63,94,0.18)",
    gradientFrom: "#E11D48",
    gradientTo:   "#FB7185",
  },
  lime: {
    text:         "text-lime-300",
    glow:         "rgba(132,204,22,0.10)",
    accent:       "rgba(132,204,22,0.8)",
    iconBg:       "rgba(132,204,22,0.14)",
    border:       "rgba(132,204,22,0.18)",
    gradientFrom: "#65A30D",
    gradientTo:   "#A3E635",
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
        background: "rgba(10,10,28,0.88)",
        border: `1px solid ${cm.border}`,
        padding: "1.25rem",
        boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
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
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
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
              <p className="text-[10px] text-zinc-600 transition-colors duration-200 group-hover:text-zinc-500">{note}</p>
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
