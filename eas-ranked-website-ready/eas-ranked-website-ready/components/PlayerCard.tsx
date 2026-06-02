"use client";

import { memo } from "react";
import type { RankTheme } from "@/lib/rankThemes";
import PlayerAvatar from "@/components/PlayerAvatar";

interface PlayerCardProps {
  name: string;
  username?: string | null;
  avatar?: string | null;
  rank: string;
  cr: number;
  winRate: number;
  mvps: number;
  winStreak: number;
  theme: RankTheme;
}

/**
 * Shareable player card — a compact, visually rich summary of a player's stats.
 * Designed to be screenshot-friendly and ready for a future download/share feature.
 */
const PlayerCard = memo(function PlayerCard({
  name,
  username,
  avatar,
  rank,
  cr,
  winRate,
  mvps,
  winStreak,
  theme,
}: PlayerCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{
        background: `linear-gradient(135deg, #0a0a16 0%, ${theme.primary}14 100%)`,
        borderColor: `${theme.primary}35`,
        boxShadow: `0 0 40px ${theme.glow}`,
      }}
    >
      {/* Background glow orb */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-15 blur-3xl"
        style={{ background: theme.primary }}
      />

      {/* Header row */}
      <div className="relative flex items-center gap-3 mb-4">
        {/* Avatar */}
        <div
          className="shrink-0 rounded-full p-0.5"
          style={{ background: `linear-gradient(135deg, ${theme.primary}90, ${theme.secondary}50)` }}
        >
          <div className="rounded-full bg-[#0a0a16] p-0.5">
            <PlayerAvatar name={name} avatar={avatar} size="h-12 w-12" />
          </div>
        </div>

        {/* Name + rank */}
        <div className="min-w-0">
          <p className="text-base font-black truncate text-white">{name}</p>
          {username && (
            <p className="text-[11px] text-zinc-500 truncate">@{username}</p>
          )}
          <span
            className="mt-1 inline-block rounded-lg border px-2 py-0.5 text-[10px] font-bold"
            style={{
              borderColor: `${theme.primary}50`,
              background: theme.badge,
              color: theme.primary,
            }}
          >
            {rank}
          </span>
        </div>

        {/* CR badge */}
        <div className="ml-auto shrink-0 text-right">
          <p
            className="text-2xl font-black tabular-nums"
            style={{ color: theme.primary }}
          >
            {cr.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">CR</p>
        </div>
      </div>

      {/* Divider */}
      <div
        className="mb-4 h-px w-full"
        style={{ background: `linear-gradient(90deg, ${theme.primary}30, transparent)` }}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="Win Rate" value={`${winRate}%`} color={theme.primary} />
        <StatPill label="MVPs" value={mvps.toLocaleString()} color={theme.secondary} />
        <StatPill label="Streak" value={winStreak > 0 ? `${winStreak}W` : "—"} color={theme.primary} />
      </div>

      {/* EAS Arena watermark */}
      <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-zinc-700 text-right">
        EAS Arena
      </p>
    </div>
  );
});

export default PlayerCard;

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl px-2 py-2 text-center"
      style={{ background: `${color}10`, border: `1px solid ${color}20` }}
    >
      <p className="text-sm font-black" style={{ color }}>{value}</p>
      <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
