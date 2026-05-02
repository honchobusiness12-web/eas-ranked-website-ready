"use client";

import { type RankBucket } from "@/lib/charts";
import { type CrPoint } from "@/lib/charts";
import { useTheme } from "@/components/ThemeProvider";

// ---------------------------------------------------------------------------
// Win / Loss donut chart (pure SVG)
// ---------------------------------------------------------------------------

interface WinLossChartProps {
  wins: number;
  losses: number;
  matches: number;
}

export function WinLossChart({ wins, losses, matches }: WinLossChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const winRate = matches ? Math.round((wins / matches) * 100) : 0;
  const r = 40;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;
  const winArc = (winRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={isLight ? "#e0e0ee" : "#27272a"} strokeWidth="14" />
          {/* Win arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={isLight ? "#7c3aed" : "#8b5cf6"}
            strokeWidth="14"
            strokeDasharray={`${winArc} ${circumference - winArc}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${isLight ? "text-purple-700" : "text-purple-400"}`}>{winRate}%</span>
          <span className={`text-xs ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>Win Rate</span>
        </div>
      </div>
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-purple-500 inline-block" />
          <span className={isLight ? "text-[#3d3d5c]" : "text-zinc-300"}>{wins} Wins</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full inline-block ${isLight ? "bg-[#c0c0d8]" : "bg-zinc-700"}`} />
          <span className={isLight ? "text-[#3d3d5c]" : "text-zinc-300"}>{losses} Losses</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CR Progression sparkline (pure SVG)
// ---------------------------------------------------------------------------

interface CrSparklineProps {
  points: CrPoint[];
}

export function CrSparkline({ points }: CrSparklineProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (points.length < 2) {
    return (
      <div className={`flex h-32 items-center justify-center text-sm ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>
        Not enough history to display chart
      </div>
    );
  }

  const W = 400;
  const H = 120;
  const PAD = 12;

  const crValues = points.map((p) => p.cr);
  const minCr = Math.min(...crValues);
  const maxCr = Math.max(...crValues);
  const range = maxCr - minCr || 1;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = (cr: number) => H - PAD - ((cr - minCr) / range) * (H - PAD * 2);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.cr).toFixed(1)}`)
    .join(" ");

  // Fill area under the line
  const fillD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${H - PAD} L ${toX(0).toFixed(1)} ${H - PAD} Z`;

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const isUp = lastPoint.cr >= firstPoint.cr;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 120 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#8b5cf6" : "#ef4444"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUp ? "#8b5cf6" : "#ef4444"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#sparkGrad)" />
        <path d={pathD} fill="none" stroke={isUp ? "#8b5cf6" : "#ef4444"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Last point dot */}
        <circle
          cx={toX(points.length - 1)}
          cy={toY(lastPoint.cr)}
          r="4"
          fill={isUp ? "#8b5cf6" : "#ef4444"}
        />
      </svg>
      <div className={`mt-2 flex justify-between text-xs ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>
        <span>{firstPoint.label}</span>
        <span className={isUp ? (isLight ? "text-green-700 font-bold" : "text-green-400 font-bold") : (isLight ? "text-red-600 font-bold" : "text-red-400 font-bold")}>
          {isUp ? "+" : ""}{lastPoint.cr - firstPoint.cr} CR
        </span>
        <span>{lastPoint.label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rank distribution bar chart (pure CSS/SVG)
// ---------------------------------------------------------------------------

interface RankDistributionChartProps {
  buckets: RankBucket[];
  totalPlayers: number;
}

export function RankDistributionChart({ buckets, totalPlayers }: RankDistributionChartProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (buckets.length === 0) {
    return <p className={`text-sm ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>No data available.</p>;
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <div className="space-y-2">
      {buckets.map((bucket) => {
        const pct = totalPlayers ? Math.round((bucket.count / totalPlayers) * 100) : 0;
        const barWidth = maxCount ? Math.round((bucket.count / maxCount) * 100) : 0;
        return (
          <div key={bucket.tier} className="flex items-center gap-3 text-sm">
            <span className={`w-32 shrink-0 text-xs truncate ${isLight ? "text-[#3d3d5c]" : "text-zinc-400"}`}>{bucket.tier}</span>
            <div className={`flex-1 h-5 rounded-full overflow-hidden ${isLight ? "bg-[#e0e0ee]" : "bg-zinc-800"}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, backgroundColor: bucket.color }}
              />
            </div>
            <span className={`w-16 text-right text-xs ${isLight ? "text-[#3d3d5c]" : "text-zinc-400"}`}>
              {bucket.count} <span className={isLight ? "text-[#9090b8]" : "text-zinc-600"}>({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat comparison bar (for PlayerComparison)
// ---------------------------------------------------------------------------

interface CompareBarProps {
  label: string;
  valueA: number;
  valueB: number;
  nameA: string;
  nameB: string;
  format?: (v: number) => string;
}

export function CompareBar({ label, valueA, valueB, nameA, nameB, format }: CompareBarProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const total = valueA + valueB || 1;
  const pctA = Math.round((valueA / total) * 100);
  const pctB = 100 - pctA;
  const fmt = format || ((v: number) => v.toLocaleString());

  return (
    <div className="space-y-1">
      <div className={`flex justify-between text-xs ${isLight ? "text-[#3d3d5c]" : "text-zinc-400"}`}>
        <span className={`font-bold ${isLight ? "text-purple-700" : "text-purple-300"}`}>{fmt(valueA)}</span>
        <span className={isLight ? "text-[#7070a0]" : "text-zinc-500"}>{label}</span>
        <span className={`font-bold ${isLight ? "text-blue-700" : "text-blue-300"}`}>{fmt(valueB)}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden">
        <div className="bg-purple-500 transition-all duration-500" style={{ width: `${pctA}%` }} />
        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${pctB}%` }} />
      </div>
      <div className={`flex justify-between text-xs ${isLight ? "text-[#9090b8]" : "text-zinc-600"}`}>
        <span>{nameA}</span>
        <span>{nameB}</span>
      </div>
    </div>
  );
}
