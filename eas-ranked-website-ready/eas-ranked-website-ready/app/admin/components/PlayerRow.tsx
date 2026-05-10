"use client";

import type { PlayerResult } from "@/app/admin/actions";

interface PlayerRowProps {
  player: PlayerResult;
  selected?: boolean;
  onSelect: (player: PlayerResult) => void;
}

export default function PlayerRow({ player, selected = false, onSelect }: PlayerRowProps) {
  const isPremium =
    !!player.premium_expires_at && new Date(player.premium_expires_at) > new Date();

  return (
    <button
      onClick={() => onSelect(player)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-white/5 last:border-0 transition-all hover:bg-white/[0.04] ${
        selected ? "bg-white/[0.06] border-l-2 border-l-cyan-500" : ""
      }`}
    >
      {/* Initials avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black select-none"
        style={{ background: "linear-gradient(135deg, #00FF88, #00D4FF)" }}
      >
        {player.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white truncate">{player.name}</p>
        <p className="text-[10px] font-mono text-zinc-500 truncate">{player.user_id}</p>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 text-right space-y-0.5">
        <p className="text-xs font-black text-orange-400">{player.cr.toLocaleString()} CR</p>
        <p className="text-[10px] text-zinc-500">
          {player.wins}W / {player.losses}L
        </p>
      </div>

      {/* Status badges */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {isPremium && (
          <span className="rounded-md border border-yellow-700/40 bg-yellow-950/40 px-1.5 py-0.5 text-[9px] font-black text-yellow-400">
            ⭐ PREM
          </span>
        )}
        {player.blacklisted && (
          <span className="rounded-md border border-red-700/40 bg-red-950/40 px-1.5 py-0.5 text-[9px] font-black text-red-400">
            BANNED
          </span>
        )}
        {!player.blacklisted && player.ranked && (
          <span className="rounded-md border border-green-700/40 bg-green-950/40 px-1.5 py-0.5 text-[9px] font-black text-green-400">
            RANKED
          </span>
        )}
      </div>
    </button>
  );
}
