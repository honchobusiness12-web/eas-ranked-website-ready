"use client";

import type { PlayerData, BadgeData } from "@/lib/admin-actions";

interface Props {
  player: PlayerData;
  badges: BadgeData[];
}

function WinRate({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <span className="text-zinc-500">—</span>;
  const pct = Math.round((wins / total) * 100);
  const color =
    pct >= 60 ? "text-green-400" : pct >= 45 ? "text-yellow-400" : "text-red-400";
  return <span className={color}>{pct}%</span>;
}

export default function PlayerCard({ player, badges }: Props) {
  const isPremiumActive =
    player.premium ||
    (player.premium_expires_at != null &&
      new Date(player.premium_expires_at) > new Date());

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">{player.name}</h2>
          <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{player.user_id}</p>
          {player.username && (
            <p className="text-xs text-zinc-500 mt-0.5">@{player.username}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {player.blacklisted && (
            <span className="rounded-lg bg-red-950/40 border border-red-700/40 px-3 py-1 text-xs font-black text-red-400">
              🚫 BANNED
            </span>
          )}
          {isPremiumActive && (
            <span className="rounded-lg bg-yellow-950/30 border border-yellow-700/30 px-3 py-1 text-xs font-black text-yellow-400">
              💎 PREMIUM
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-300"
              title={b.description}
            >
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "CR",         value: player.cr.toLocaleString(),                color: "text-orange-400" },
          { label: "Matches",    value: player.matches.toLocaleString(),           color: "text-white" },
          { label: "Wins",       value: player.wins.toLocaleString(),              color: "text-green-400" },
          { label: "Losses",     value: player.losses.toLocaleString(),            color: "text-red-400" },
          { label: "Kills",      value: player.kills.toLocaleString(),             color: "text-yellow-400" },
          { label: "MVPs",       value: player.mvp_count.toLocaleString(),         color: "text-purple-400" },
          { label: "Placements", value: player.placement_matches.toLocaleString(), color: "text-blue-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-zinc-500">Win Rate</p>
          <WinRate wins={player.wins} losses={player.losses} />
        </div>
        {player.wins + player.losses > 0 && (
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-500"
              style={{
                width: `${Math.round(
                  (player.wins / (player.wins + player.losses)) * 100
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-2">
        {player.ranked && (
          <span className="rounded-lg bg-green-950/30 border border-green-700/30 px-2.5 py-1 text-xs font-bold text-green-400">
            ✅ Ranked
          </span>
        )}
        {player.registered && (
          <span className="rounded-lg bg-blue-950/30 border border-blue-700/30 px-2.5 py-1 text-xs font-bold text-blue-400">
            📋 Registered
          </span>
        )}
        {player.premium_expires_at && (
          <span className="rounded-lg bg-zinc-900 border border-white/5 px-2.5 py-1 text-xs font-bold text-zinc-400">
            ⏰ Expires: {new Date(player.premium_expires_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Profile link */}
      <a
        href={`/profile/${player.user_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-xl border border-white/10 px-4 py-2 text-center text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition"
      >
        👤 View Public Profile →
      </a>
    </div>
  );
}
