"use client";

import { useState } from "react";
import type { CrPoint } from "@/lib/charts";

interface MatchTimelineProps {
  points: CrPoint[];
}

export default function MatchTimeline({ points }: MatchTimelineProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-3xl">📭</span>
        <p className="text-xs text-zinc-500 font-medium">No match history saved yet.</p>
      </div>
    );
  }

  // Show most recent first
  const items = [...points].reverse();

  return (
    <div className="relative space-y-0">
      {/* Vertical spine */}
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-white/[0.06]" />

      {items.map((point, idx) => {
        const isWin  = point.result === "win";
        const isLoss = point.result === "loss";
        const isOpen = expanded === idx;

        const dotColor  = isWin  ? "#22c55e" : isLoss ? "#ef4444" : "#6b7280";
        const rowBg     = isWin  ? "bg-green-950/10 border-green-800/20 hover:bg-green-950/20"
                        : isLoss ? "bg-red-950/10 border-red-800/20 hover:bg-red-950/20"
                        :          "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]";
        const crColor   = (point.crDelta ?? 0) >= 0 ? "text-green-400" : "text-red-400";
        const crSign    = (point.crDelta ?? 0) >= 0 ? "+" : "";
        const resultIcon = isWin ? "✅" : isLoss ? "❌" : "➖";

        return (
          <div key={idx} className="relative pl-10">
            {/* Timeline dot */}
            <div
              className="absolute left-[13px] top-[18px] h-3 w-3 rounded-full border-2 border-[#0d0d18] transition-transform duration-200"
              style={{
                background: dotColor,
                boxShadow: isOpen ? `0 0 8px ${dotColor}` : "none",
                transform: isOpen ? "scale(1.3)" : "scale(1)",
              }}
            />

            {/* Row */}
            <button
              onClick={() => setExpanded(isOpen ? null : idx)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 mb-1.5 transition-all duration-200 ${rowBg}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{resultIcon}</span>
                  <span className="text-xs font-bold text-zinc-300 truncate">
                    {point.label}
                  </span>
                  {point.mvp && (
                    <span className="shrink-0 rounded-md border border-yellow-600/30 bg-yellow-950/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-400">
                      MVP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {point.crDelta !== undefined && (
                    <span className={`text-xs font-black tabular-nums ${crColor}`}>
                      {crSign}{point.crDelta} CR
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {point.crAfter?.toLocaleString()} CR
                  </span>
                  <span
                    className="text-zinc-600 transition-transform duration-200"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}
                  >
                    ▾
                  </span>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div
                  className="mt-2.5 pt-2.5 border-t border-white/[0.06] grid grid-cols-2 gap-x-4 gap-y-1.5"
                  style={{ animation: "fade-in 0.2s ease-out both" }}
                >
                  {point.crBefore !== undefined && (
                    <DetailRow label="CR Before" value={point.crBefore.toLocaleString()} />
                  )}
                  {point.crAfter !== undefined && (
                    <DetailRow label="CR After" value={point.crAfter.toLocaleString()} />
                  )}
                  {point.result && (
                    <DetailRow
                      label="Result"
                      value={point.result.charAt(0).toUpperCase() + point.result.slice(1)}
                      valueClass={isWin ? "text-green-400" : "text-red-400"}
                    />
                  )}
                  {point.rank && (
                    <DetailRow label="Rank" value={point.rank} />
                  )}
                  {point.mvp && (
                    <DetailRow label="MVP" value="Yes 🌟" valueClass="text-yellow-400" />
                  )}
                  {point.note && (
                    <div className="col-span-2">
                      <DetailRow label="Note" value={point.note} />
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClass = "text-zinc-300",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-zinc-600">{label}</span>
      <span className={`text-[10px] font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}
