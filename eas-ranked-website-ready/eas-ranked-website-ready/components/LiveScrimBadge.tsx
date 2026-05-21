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
    <div className="mb-4 animate-fade-in rounded-2xl border border-red-500/50 bg-red-950/20 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Pulsing live indicator */}
        <div className="relative flex shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </div>

        {/* Scrim details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-red-400">🔴 LIVE SCRIM</p>
          <p className="mt-0.5 text-xs text-red-300">
            {scrim.type} &bull; {scrim.playerCount} players &bull; {scrim.startedMinutesAgo}m ago
          </p>
          <p className="mt-1 text-[10px] text-red-400/70">
            Hosted by {scrim.host}
          </p>
        </div>
      </div>
    </div>
  );
}
