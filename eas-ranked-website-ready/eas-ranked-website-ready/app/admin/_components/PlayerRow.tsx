"use client";

import type { PlayerRow as PlayerRowType } from "../_actions";

interface Props {
  player: PlayerRowType;
  isSelected: boolean;
  onSelect: (player: PlayerRowType) => void;
}

function WinRate({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <span className="text-zinc-500">—</span>;
  const pct = Math.round((wins / total) * 100);
  const color =
    pct >= 60
      ? "text-green-400"
      : pct >= 45
      ? "text-yellow-400"
      : "text-red-400";
  return <span className={color}>{pct}%</span>;
}

export function PlayerRow({ player, isSelected, onSelect }: Props) {
  return (
    <tr
      className={`hover:bg-white/[0.03] transition ${
        isSelected ? "bg-white/[0.05]" : ""
      }`}
    >
      <td className="px-4 py-3">
        <p className="font-bold text-white">{player.name}</p>
        <p className="text-[10px] font-mono text-zinc-600">{player.user_id}</p>
      </td>
      <td className="px-4 py-3 text-right font-black text-orange-400">
        {player.cr.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-zinc-400">
        {player.wins}/{player.losses}
      </td>
      <td className="px-4 py-3 text-right">
        <WinRate wins={player.wins} losses={player.losses} />
      </td>
      <td className="px-4 py-3 text-center">
        {player.blacklisted ? (
          <span className="rounded-md bg-red-950/40 border border-red-700/40 px-2 py-0.5 text-[10px] font-black text-red-400">
            BANNED
          </span>
        ) : player.ranked ? (
          <span className="rounded-md bg-green-950/40 border border-green-700/40 px-2 py-0.5 text-[10px] font-black text-green-400">
            RANKED
          </span>
        ) : (
          <span className="rounded-md bg-zinc-900 border border-white/5 px-2 py-0.5 text-[10px] font-black text-zinc-500">
            UNRANKED
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onSelect(player)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition"
        >
          View →
        </button>
      </td>
    </tr>
  );
}
