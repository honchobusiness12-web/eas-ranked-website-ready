"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { CrPoint } from "@/lib/charts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function smoothPath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx.toFixed(2)} ${prev.y.toFixed(2)}, ${cpx.toFixed(2)} ${curr.y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipData {
  point: CrPoint;
  x: number;
  y: number;
  svgX: number;
  svgY: number;
}

function Tooltip({ data, containerWidth }: { data: TooltipData; containerWidth: number }) {
  const { point } = data;
  const isWin = point.result === "win";
  const isLoss = point.result === "loss";
  const deltaPositive = (point.crDelta ?? 0) > 0;

  // Flip tooltip to left side when near right edge
  const flipLeft = data.x > containerWidth * 0.65;

  return (
    <div
      className="pointer-events-none absolute z-50 min-w-[160px] max-w-[200px]"
      style={{
        top: Math.max(8, data.y - 8),
        left: flipLeft ? "auto" : data.x + 14,
        right: flipLeft ? containerWidth - data.x + 14 : "auto",
        transform: "translateY(-50%)",
      }}
    >
      <div
        className="rounded-xl border p-3 text-xs shadow-2xl"
        style={{
          background: "rgba(10,10,22,0.97)",
          borderColor: isWin
            ? "rgba(34,197,94,0.4)"
            : isLoss
            ? "rgba(239,68,68,0.4)"
            : "rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          boxShadow: isWin
            ? "0 8px 32px rgba(34,197,94,0.15), 0 2px 8px rgba(0,0,0,0.6)"
            : isLoss
            ? "0 8px 32px rgba(239,68,68,0.15), 0 2px 8px rgba(0,0,0,0.6)"
            : "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="font-black text-white text-[11px] tracking-tight">
            {point.label}
          </span>
          {point.result && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                isWin
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {isWin ? "✓ Win" : "✗ Loss"}
            </span>
          )}
        </div>

        {/* CR values */}
        <div className="space-y-1">
          {point.crBefore !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Before</span>
              <span className="font-bold text-zinc-300 tabular-nums">
                {point.crBefore.toLocaleString()}
              </span>
            </div>
          )}
          {point.crAfter !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">After</span>
              <span className="font-bold text-white tabular-nums">
                {point.crAfter.toLocaleString()}
              </span>
            </div>
          )}
          {point.crDelta !== undefined && (
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-1 mt-1">
              <span className="text-zinc-500">Change</span>
              <span
                className={`font-black tabular-nums ${
                  deltaPositive ? "text-green-400" : "text-red-400"
                }`}
              >
                {deltaPositive ? "+" : ""}
                {point.crDelta}
              </span>
            </div>
          )}
        </div>

        {/* Rank */}
        {point.rank && (
          <div className="mt-2 pt-1.5 border-t border-white/[0.06]">
            <span className="text-zinc-600">Rank: </span>
            <span className="text-zinc-300 font-bold">{point.rank}</span>
          </div>
        )}

        {/* MVP badge */}
        {point.mvp && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-yellow-400 text-[10px]">⭐</span>
            <span className="text-yellow-400 font-black text-[10px] uppercase tracking-wider">
              MVP
            </span>
          </div>
        )}

        {/* Note */}
        {point.note && (
          <p className="mt-1.5 text-zinc-500 text-[10px] italic">{point.note}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main chart component
// ---------------------------------------------------------------------------

interface InteractiveCrChartProps {
  points: CrPoint[];
}

export function InteractiveCrChart({ points }: InteractiveCrChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [animated, setAnimated] = useState(false);
  const lineRef = useRef<SVGPathElement>(null);

  // Observe container width for responsive layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth || 400);
    return () => ro.disconnect();
  }, []);

  // Trigger line-draw animation on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (points.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
        Not enough history to display chart
      </div>
    );
  }

  // Chart dimensions
  const W = containerWidth;
  const H = 140;
  const PAD_X = 16;
  const PAD_Y = 16;

  const crValues = points.map((p) => p.cr);
  const minCr = Math.min(...crValues);
  const maxCr = Math.max(...crValues);
  const range = maxCr - minCr || 1;

  const toX = (i: number) =>
    PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const toY = (cr: number) =>
    H - PAD_Y - ((cr - minCr) / range) * (H - PAD_Y * 2);

  const coords = points.map((p, i) => ({ x: toX(i), y: toY(p.cr) }));
  const linePath = smoothPath(coords);
  const fillPath =
    linePath +
    ` L ${coords[coords.length - 1].x.toFixed(2)} ${(H - PAD_Y).toFixed(2)}` +
    ` L ${coords[0].x.toFixed(2)} ${(H - PAD_Y).toFixed(2)} Z`;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const overallDelta = lastPoint.cr - firstPoint.cr;
  const isUp = overallDelta >= 0;

  // Line color: orange-to-green gradient for up, orange-to-red for down
  const lineColor = isUp ? "#22c55e" : "#ef4444";
  const gradId = `crGrad_${W}`;
  const glowId = `crGlow_${W}`;
  const maskId = `crMask_${W}`;

  // Compute line length for dash animation
  const lineLength = lineRef.current?.getTotalLength() ?? 2000;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Find closest point
      let closest = 0;
      let minDist = Infinity;
      coords.forEach((c, i) => {
        const dist = Math.abs(c.x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });

      const pt = points[closest];
      const c = coords[closest];
      // Convert SVG coords to container-relative pixel coords
      const scaleX = rect.width / W;
      const scaleY = rect.height / H;

      setTooltip({
        point: pt,
        x: c.x * scaleX,
        y: c.y * scaleY,
        svgX: c.x,
        svgY: c.y,
      });
    },
    [coords, points, W, H],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Touch support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const touch = e.touches[0];
      const rect = svg.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;

      let closest = 0;
      let minDist = Infinity;
      coords.forEach((c, i) => {
        const dist = Math.abs(c.x - touchX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });

      const pt = points[closest];
      const c = coords[closest];
      const scaleX = rect.width / W;
      const scaleY = rect.height / H;

      setTooltip({
        point: pt,
        x: c.x * scaleX,
        y: c.y * scaleY,
        svgX: c.x,
        svgY: c.y,
      });
    },
    [coords, points, W, H],
  );

  const handleTouchEnd = useCallback(() => {
    // Keep tooltip visible briefly on touch
    setTimeout(() => setTooltip(null), 1800);
  }, []);

  const activeIndex = tooltip
    ? points.findIndex((p) => p === tooltip.point)
    : -1;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          {/* Area fill gradient */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>

          {/* Glow filter for the line */}
          <filter id={glowId} x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip mask for line-draw animation */}
          <clipPath id={maskId}>
            <rect
              x="0"
              y="0"
              width={animated ? W : 0}
              height={H}
              style={{
                transition: animated ? "width 0.9s cubic-bezier(0.4,0,0.2,1)" : "none",
              }}
            />
          </clipPath>
        </defs>

        {/* Subtle horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => {
          const y = PAD_Y + frac * (H - PAD_Y * 2);
          return (
            <line
              key={frac}
              x1={PAD_X}
              y1={y}
              x2={W - PAD_X}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          );
        })}

        {/* Area fill (clipped) */}
        <g clipPath={`url(#${maskId})`}>
          <path d={fillPath} fill={`url(#${gradId})`} />
        </g>

        {/* Main line (clipped + glow) */}
        <g clipPath={`url(#${maskId})`}>
          <path
            ref={lineRef}
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
            opacity="0.9"
          />
        </g>

        {/* Per-point dots */}
        {points.map((pt, i) => {
          const c = coords[i];
          const isWin = pt.result === "win";
          const isLoss = pt.result === "loss";
          const isActive = i === activeIndex;
          const isLast = i === points.length - 1;
          const dotColor = isWin ? "#22c55e" : isLoss ? "#ef4444" : "#f97316";
          const r = isLast ? 5 : isActive ? 4.5 : 3;

          return (
            <g key={i}>
              {/* Glow ring for wins/losses */}
              {(isWin || isLoss || isLast) && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={r + 4}
                  fill={dotColor}
                  opacity={isActive || isLast ? 0.25 : 0.1}
                  style={{
                    transition: "opacity 0.2s ease, r 0.2s ease",
                  }}
                />
              )}
              {/* Outer ring on hover/last */}
              {(isActive || isLast) && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={r + 2}
                  fill="none"
                  stroke={dotColor}
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              )}
              {/* Core dot */}
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                fill={dotColor}
                stroke="rgba(10,10,22,0.8)"
                strokeWidth="1.5"
                style={{ transition: "r 0.15s ease" }}
              />
              {/* MVP star */}
              {pt.mvp && (
                <text
                  x={c.x}
                  y={c.y - r - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#fbbf24"
                >
                  ★
                </text>
              )}
              {/* Invisible wide hit area for easier hover */}
              <rect
                x={c.x - 16}
                y={0}
                width={32}
                height={H}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* Vertical crosshair on hover */}
        {tooltip && activeIndex >= 0 && (
          <line
            x1={coords[activeIndex].x}
            y1={PAD_Y}
            x2={coords[activeIndex].x}
            y2={H - PAD_Y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <Tooltip data={tooltip} containerWidth={containerWidth} />
      )}

      {/* Bottom labels */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-600">
        <span>{firstPoint.label}</span>
        <span
          className={`font-black tabular-nums ${
            isUp ? "text-green-400" : "text-red-400"
          }`}
        >
          {isUp ? "+" : ""}
          {overallDelta} CR
        </span>
        <span>{lastPoint.label}</span>
      </div>
    </div>
  );
}
