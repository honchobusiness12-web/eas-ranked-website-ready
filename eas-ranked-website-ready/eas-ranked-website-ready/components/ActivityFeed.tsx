"use client";

import { useEffect, useState, memo, useMemo } from "react";
import type { CachedPlayer } from "@/lib/cache";
import { getRank } from "@/lib/ranks";
import { getTierColor } from "@/lib/charts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityEvent {
  id: string;
  type: "cr_gain" | "cr_loss" | "rank_up" | "mvp" | "placement";
  playerName: string;
  playerAvatar: string | null;
  userId: string;
  description: string;
  icon: string;
  color: string;
  crDelta?: number;
  rank?: string;
}

// ---------------------------------------------------------------------------
// Derive recent activity from player history data
// ---------------------------------------------------------------------------

function deriveActivity(players: CachedPlayer[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const p of players) {
    const history: string[] = Array.isArray((p as any).history) ? (p as any).history : [];
    if (history.length === 0) continue;

    // Look at the last 3 history entries per player
    const recent = history.slice(-3).reverse();

    for (let i = 0; i < recent.length; i++) {
      const entry = recent[i];
      const deltaMatch = entry.match(/([+-]\d+)\s*CR/i);
      if (!deltaMatch) continue;

      const delta = parseInt(deltaMatch[1], 10);
      const lower = entry.toLowerCase();
      const isMvp = lower.includes("mvp");
      const isWin = lower.includes("win") || delta > 0;
      const cr = Number(p.cr || 0);
      const rank = getRank(cr);
      const rankColor = getTierColor(rank);

      const id = `${p.user_id}-${i}-${delta}`;

      if (isMvp) {
        events.push({
          id,
          type: "mvp",
          playerName: p.name,
          playerAvatar: p.avatar_url,
          userId: p.user_id,
          description: `earned MVP`,
          icon: "🌟",
          color: "#fbbf24",
          crDelta: delta,
          rank,
        });
      } else if (isWin && delta > 0) {
        events.push({
          id,
          type: "cr_gain",
          playerName: p.name,
          playerAvatar: p.avatar_url,
          userId: p.user_id,
          description: `gained ${delta} CR`,
          icon: "📈",
          color: "#22c55e",
          crDelta: delta,
          rank,
        });
      } else if (!isWin && delta < 0) {
        events.push({
          id,
          type: "cr_loss",
          playerName: p.name,
          playerAvatar: p.avatar_url,
          userId: p.user_id,
          description: `lost ${Math.abs(delta)} CR`,
          icon: "📉",
          color: "#ef4444",
          crDelta: delta,
          rank,
        });
      }
    }
  }

  // Shuffle slightly so it doesn't always show the same order, then cap at 12
  return events.slice(0, 12);
}

// ---------------------------------------------------------------------------
// Mini avatar
// ---------------------------------------------------------------------------

function MiniAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-white/10"
        loading="lazy"
      />
    );
  }
  const gradients = [
    "from-orange-600 to-red-600",
    "from-purple-600 to-violet-600",
    "from-blue-600 to-indigo-600",
    "from-green-600 to-teal-600",
  ];
  const g = gradients[name.charCodeAt(0) % gradients.length];
  return (
    <div className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${g} flex items-center justify-center text-white text-xs font-black ring-1 ring-white/10`}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ActivityFeedProps {
  players: CachedPlayer[];
}

const ActivityFeed = memo(function ActivityFeed({ players }: ActivityFeedProps) {
  const [visible, setVisible] = useState(false);
  const events = useMemo(() => deriveActivity(players), [players]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-2xl">🌙</span>
        <p className="text-xs text-zinc-500 font-medium">No recent activity to show.</p>
        <p className="text-[10px] text-zinc-700">Activity appears as players log matches.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, idx) => (
        <a
          key={event.id}
          href={`/profile/${event.userId}`}
          className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-white/[0.04]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(-8px)",
            transition: `opacity 0.3s ease ${idx * 40}ms, transform 0.3s ease ${idx * 40}ms`,
          }}
        >
          {/* Activity icon */}
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs"
            style={{ background: `${event.color}18` }}
          >
            {event.icon}
          </div>

          {/* Avatar */}
          <MiniAvatar name={event.playerName} avatar={event.playerAvatar} />

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-tight">
              <span className="font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                {event.playerName}
              </span>{" "}
              <span className="text-zinc-500">{event.description}</span>
            </p>
            {event.rank && (
              <p
                className="text-[10px] font-medium truncate"
                style={{ color: getTierColor(event.rank) }}
              >
                {event.rank}
              </p>
            )}
          </div>

          {/* CR delta badge */}
          {event.crDelta !== undefined && (
            <span
              className="shrink-0 text-[10px] font-black tabular-nums"
              style={{ color: event.color }}
            >
              {event.crDelta > 0 ? "+" : ""}{event.crDelta}
            </span>
          )}
        </a>
      ))}
    </div>
  );
});

export default ActivityFeed;
