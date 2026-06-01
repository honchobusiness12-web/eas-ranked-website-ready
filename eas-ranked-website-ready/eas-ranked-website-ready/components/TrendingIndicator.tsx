"use client";

interface TrendingIndicatorProps {
  delta: number;
  animate?: boolean;
  showZero?: boolean;
}

export default function TrendingIndicator({ delta, animate = false, showZero = false }: TrendingIndicatorProps) {
  if (delta === 0 && !showZero) {
    return <span className="text-xs text-zinc-600 font-medium">—</span>;
  }

  const isUp = delta > 0;
  const isZero = delta === 0;

  if (isZero) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/[0.05] text-zinc-500 border border-white/[0.08]">
        — 0
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isUp
          ? "bg-green-500/10 text-green-400 border border-green-500/20"
          : "bg-red-500/10 text-red-400 border border-red-500/20"
      } ${animate ? "animate-pulse" : ""}`}
    >
      {isUp ? "↑" : "↓"}
      {Math.abs(delta)}
    </span>
  );
}
