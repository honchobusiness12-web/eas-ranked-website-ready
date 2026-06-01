"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveScrim {
  scrimId: string;
  type: string;
  host: string;
  playerCount: number;
  startedMinutesAgo: number;
}

// ---------------------------------------------------------------------------
// LiveScrimBadge — polls /api/scrims/active every 10 seconds and renders a
// pulsing "LIVE SCRIM" banner when a scrim session is in progress.
// ---------------------------------------------------------------------------

export function LiveScrimBadge() {
  const [scrim, setScrim] = useState<ActiveScrim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScrim = async () => {
      try {
        const res = await fetch("/api/scrims/active");
        const data = await res.json();
        setScrim(data.active ? data.scrim : null);
      } catch (error) {
        console.error("Failed to fetch active scrim:", error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately on mount, then poll every 10 seconds
    fetchScrim();
    const interval = setInterval(fetchScrim, 10_000);
    return () => clearInterval(interval);
  }, []);
  if (loading || !scrim) return null;

  return (
    <div
      className="mb-5 animate-fade-in rounded-2xl border border-red-500/25 p-4 backdrop-blur-sm"
      style={{
        background: "rgba(127,29,29,0.08)",
        boxShadow: "0 0 24px rgba(239,68,68,0.08), 0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* Top accent */}
      <div className="neon-line-red mb-3" />

      <div className="flex items-center gap-3">
        {/* Pulsing live indicator */}
        <div className="relative flex shrink-0 h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </div>

        {/* Scrim details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-red-400">🔴 LIVE SCRIM</p>
            <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
              {scrim.type}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300">{scrim.playerCount}</span> players ·{" "}
            <span className="font-semibold text-zinc-300">{scrim.startedMinutesAgo}m</span> ago ·{" "}
            Hosted by <span className="font-semibold text-zinc-200">{scrim.host}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
