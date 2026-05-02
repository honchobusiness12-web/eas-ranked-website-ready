"use client";

import PlayerAvatar from "@/components/PlayerAvatar";
import RankBadge from "@/components/RankBadge";
import { CompareBar, CompareLegend } from "@/components/StatsChart";
import { WinLossChart } from "@/components/StatsChart";

interface Player {
  user_id: string;
  name: string;
  username?: string | null;
  avatar_url?: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
}

interface PlayerComparisonProps {
  playerA: Player;
  playerB: Player;
}

export default function PlayerComparison({ playerA, playerB }: PlayerComparisonProps) {
  const crA = Number(playerA.cr || 0);
  const crB = Number(playerB.cr || 0);
  const winsA = Number(playerA.wins || 0);
  const winsB = Number(playerB.wins || 0);
  const lossesA = Number(playerA.losses || 0);
  const lossesB = Number(playerB.losses || 0);
  const killsA = Number(playerA.kills || 0);
  const killsB = Number(playerB.kills || 0);
  const matchesA = Number(playerA.matches || 0);
  const matchesB = Number(playerB.matches || 0);
  const mvpA = Number(playerA.mvp_count || 0);
  const mvpB = Number(playerB.mvp_count || 0);

  const winRateA = matchesA ? Math.round((winsA / matchesA) * 100) : 0;
  const winRateB = matchesB ? Math.round((winsB / matchesB) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header — side by side */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Player A */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-purple-700/40 bg-purple-950/20 p-5">
          <PlayerAvatar name={playerA.name} avatar={playerA.avatar_url} size="h-16 w-16" />
          <div className="text-center">
            <p className="text-lg font-black">{playerA.name}</p>
            <p className="text-xs text-zinc-500">{playerA.username || "—"}</p>
          </div>
          <RankBadge cr={crA} size="md" />
          <p className="text-3xl font-black text-purple-400">{crA} CR</p>
        </div>

        <div className="text-2xl font-black text-zinc-600">VS</div>

        {/* Player B */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-orange-700/40 bg-orange-950/20 p-5">
          <PlayerAvatar name={playerB.name} avatar={playerB.avatar_url} size="h-16 w-16" />
          <div className="text-center">
            <p className="text-lg font-black">{playerB.name}</p>
            <p className="text-xs text-zinc-500">{playerB.username || "—"}</p>
          </div>
          <RankBadge cr={crB} size="md" />
          <p className="text-3xl font-black text-orange-400">{crB} CR</p>
        </div>
      </div>

      {/* Win/Loss charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
          <p className="mb-4 text-sm font-bold text-zinc-400 text-center">{playerA.name}</p>
          <WinLossChart wins={winsA} losses={lossesA} matches={matchesA} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
          <p className="mb-4 text-sm font-bold text-zinc-400 text-center">{playerB.name}</p>
          <WinLossChart wins={winsB} losses={lossesB} matches={matchesB} />
        </div>
      </div>

      {/* Comparison bars */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 space-y-5">
        <h3 className="text-lg font-black">📊 Head-to-Head Stats</h3>
        <CompareLegend nameA={playerA.name} nameB={playerB.name} />
        <CompareBar label="CR" valueA={crA} valueB={crB} nameA={playerA.name} nameB={playerB.name} />
        <CompareBar label="Wins" valueA={winsA} valueB={winsB} nameA={playerA.name} nameB={playerB.name} />
        <CompareBar label="Kills" valueA={killsA} valueB={killsB} nameA={playerA.name} nameB={playerB.name} />
        <CompareBar label="Matches" valueA={matchesA} valueB={matchesB} nameA={playerA.name} nameB={playerB.name} />
        <CompareBar label="MVPs" valueA={mvpA} valueB={mvpB} nameA={playerA.name} nameB={playerB.name} />
        <CompareBar
          label="Win Rate"
          valueA={winRateA}
          valueB={winRateB}
          nameA={playerA.name}
          nameB={playerB.name}
          format={(v) => `${v}%`}
        />
      </div>

      {/* Quick verdict */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
        <h3 className="mb-4 text-lg font-black">🏆 Verdict</h3>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <VerdictCell
            label="Higher CR"
            winner={crA > crB ? playerA.name : crB > crA ? playerB.name : "Tied"}
            tied={crA === crB}
            nameA={playerA.name}
          />
          <VerdictCell
            label="More Wins"
            winner={winsA > winsB ? playerA.name : winsB > winsA ? playerB.name : "Tied"}
            tied={winsA === winsB}
            nameA={playerA.name}
          />
          <VerdictCell
            label="Better Win Rate"
            winner={winRateA > winRateB ? playerA.name : winRateB > winRateA ? playerB.name : "Tied"}
            tied={winRateA === winRateB}
            nameA={playerA.name}
          />
        </div>
      </div>
    </div>
  );
}

function VerdictCell({
  label,
  winner,
  tied,
  nameA,
}: {
  label: string;
  winner: string;
  tied: boolean;
  nameA: string;
}) {
  const isA = !tied && winner === nameA;
  const colorClass = tied
    ? "text-zinc-400"
    : isA
    ? "text-violet-400"
    : "text-orange-400";
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 font-black ${colorClass}`}>{winner}</p>
    </div>
  );
}
