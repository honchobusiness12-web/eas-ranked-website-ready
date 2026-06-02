"use client";

import { type RankBucket } from "@/lib/charts";
import { type CrPoint } from "@/lib/charts";
export { InteractiveCrChart } from "@/components/InteractiveCrChart";

// ---------------------------------------------------------------------------
// Win / Loss donut chart (pure SVG)
// ---------------------------------------------------------------------------

interface WinLossChartProps {
  wins: number;
  losses: number;
  matches: number;
}

export function WinLossChart({ wins, losses, matches }: WinLossChartProps) {
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
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,207,255,0.12)" strokeWidth="14" />
          {/* Win arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#00CFFF"
            strokeWidth="14"
            strokeDasharray={`${winArc} ${circumference - winArc}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color: "#00CFFF" }}>{winRate}%</span>
          <span className="text-xs" style={{ color: "rgba(168,255,246,0.55)" }}>Win Rate</span>
        </div>
      </div>
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: "#00CFFF" }} />
          <span style={{ color: "rgba(168,255,246,0.80)" }}>{wins} Wins</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: "rgba(168,255,246,0.20)" }} />
          <span style={{ color: "rgba(168,255,246,0.80)" }}>{losses} Losses</span>
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
  if (points.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-sm" style={{ color: "rgba(168,255,246,0.55)" }}>
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
            <stop offset="0%" stopColor={isUp ? "#00CFFF" : "#FF7F50"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUp ? "#00CFFF" : "#FF7F50"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#sparkGrad)" />
        <path d={pathD} fill="none" stroke={isUp ? "#00CFFF" : "#FF7F50"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Last point dot */}
        <circle
          cx={toX(points.length - 1)}
          cy={toY(lastPoint.cr)}
          r="4"
          fill={isUp ? "#00CFFF" : "#FF7F50"}
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs" style={{ color: "rgba(168,255,246,0.55)" }}>
        <span>{firstPoint.label}</span>
        <span className="font-bold" style={{ color: isUp ? "#4ade80" : "#FF7F50" }}>
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
  if (buckets.length === 0) {
    return <p className="text-sm" style={{ color: "rgba(168,255,246,0.55)" }}>No data available.</p>;
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <div className="space-y-2">
      {buckets.map((bucket) => {
        const pct = totalPlayers ? Math.round((bucket.count / totalPlayers) * 100) : 0;
        const barWidth = maxCount ? Math.round((bucket.count / maxCount) * 100) : 0;
        return (
          <div key={bucket.tier} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-xs truncate" style={{ color: "rgba(168,255,246,0.70)" }}>{bucket.tier}</span>
            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(0,207,255,0.10)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, backgroundColor: bucket.color, boxShadow: `0 0 8px ${bucket.color}60` }}
              />
            </div>
            <span className="w-16 text-right text-xs" style={{ color: "rgba(168,255,246,0.60)" }}>
              {bucket.count} <span style={{ color: "rgba(168,255,246,0.35)" }}>({pct}%)</span>
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
  const total = valueA + valueB || 1;
  const pctA = Math.round((valueA / total) * 100);
  const pctB = 100 - pctA;
  const fmt = format || ((v: number) => v.toLocaleString());

  const aWins = valueA > valueB;
  const bWins = valueB > valueA;

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-center">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(168,255,246,0.55)" }}>{label}</span>
      </div>
      {/* Value + bar row */}
      <div className="flex items-center gap-2">
        {/* Player A value */}
        <span
          className="w-16 text-right text-sm font-black tabular-nums"
          style={{ color: aWins ? "#00CFFF" : "rgba(168,255,246,0.55)" }}
        >
          {fmt(valueA)}
        </span>
        {/* Bar */}
        <div className="flex flex-1 h-4 rounded-full overflow-hidden" style={{ background: "rgba(0,207,255,0.10)" }}>
          <div
            className="h-full rounded-l-full transition-all duration-500"
            style={{
              width: `${pctA}%`,
              background: "linear-gradient(90deg, #00CFFF, #4DEEEA)",
            }}
          />
          <div
            className="h-full rounded-r-full transition-all duration-500"
            style={{
              width: `${pctB}%`,
              background: "linear-gradient(90deg, #FF7F50, #FF8C42)",
            }}
          />
        </div>
        {/* Player B value */}
        <span
          className="w-16 text-left text-sm font-black tabular-nums"
          style={{ color: bWins ? "#FF7F50" : "rgba(168,255,246,0.55)" }}
        >
          {fmt(valueB)}
        </span>
      </div>
      {/* Name labels */}
      <div className="flex justify-between px-[4.5rem] text-xs" style={{ color: "rgba(168,255,246,0.55)" }}>
        <span className="font-medium truncate max-w-[45%]" style={{ color: "rgba(0,207,255,0.70)" }}>{nameA}</span>
        <span className="font-medium truncate max-w-[45%] text-right" style={{ color: "rgba(255,127,80,0.70)" }}>{nameB}</span>
      </div>
    </div>
  );
}

/* ============================================================
   CompareBar legend — renders once above the bars
   ============================================================ */

interface CompareLegendProps {
  nameA: string;
  nameB: string;
}

export function CompareLegend({ nameA, nameB }: CompareLegendProps) {
  return (
    <div className="flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold" style={{ background: "rgba(0,207,255,0.07)", border: "1px solid rgba(0,207,255,0.15)" }}>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-8 rounded-full"
          style={{ background: "linear-gradient(90deg, #00CFFF, #4DEEEA)" }}
        />
        <span style={{ color: "#00CFFF" }}>{nameA}</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: "#FF7F50" }}>{nameB}</span>
        <span
          className="inline-block h-3 w-8 rounded-full"
          style={{ background: "linear-gradient(90deg, #FF7F50, #FF8C42)" }}
        />
      </div>
    </div>
  );
}
