"use client";

/**
 * app/admin/components/PlayerCard.tsx
 *
 * Displays player identity, stats, and status.
 * Pure display component — receives data via props.
 */

import { type AdminPlayer } from "@/lib/admin/actions";

interface Props {
  player: AdminPlayer;
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-center">
      <p className={`text-lg font-black ${accent ?? "text-white"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">
        {label}
      </p>
    </div>
  );
}

export default function PlayerCard({ player }: Props) {
  const initials = (player.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const total = player.wins + player.losses;
  const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0;
  const winRateColor =
    winRate >= 60
      ? "text-green-400"
      : winRate >= 45
      ? "text-yellow-400"
      : "text-red-400";

  const hasPremium =
    player.premium ||
    (player.premium_expires_at &&
      new Date(player.premium_expires_at) > new Date());

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        border: "2px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.60))",
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center gap-4">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-black text-lg text-black select-none"
          style={{ background: "linear-gradient(135deg, #00FF88, #00D4FF)" }}
        >
          {initials}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-black text-lg text-white truncate">
              {player.name}
            </h2>
            {hasPremium && (
              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black border border-yellow-500/50 bg-yellow-950/30 text-yellow-300">
                ⭐ Premium
              </span>
            )}
            {player.blacklisted && (
              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black border border-red-500/50 bg-red-950/30 text-red-400">
                🚫 Banned
              </span>
            )}
            {player.ranked && !player.blacklisted && (
              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black border border-green-500/50 bg-green-950/30 text-green-400">
                ✅ Ranked
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-0.5 truncate">
            {player.user_id}
          </p>
          {player.username && (
            <p className="text-xs text-zinc-600 font-bold mt-0.5">
              @{player.username}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="p-4 grid grid-cols-4 gap-2">
        <StatBox label="CR" value={player.cr} accent="text-orange-400" />
        <StatBox label="Wins" value={player.wins} accent="text-green-400" />
        <StatBox label="Losses" value={player.losses} accent="text-red-400" />
        <StatBox
          label="Win%"
          value={`${winRate}%`}
          accent={winRateColor}
        />
      </div>

      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <StatBox label="Matches" value={player.matches} />
        <StatBox label="Kills" value={player.kills} />
        <StatBox label="MVPs" value={player.mvp_count} />
      </div>

      {/* Premium expiry */}
      {player.premium_expires_at && (
        <div className="px-4 pb-4">
          <p className="text-[11px] text-zinc-500 font-bold text-center">
            Premium expires:{" "}
            <span className="text-yellow-400">
              {new Date(player.premium_expires_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
