"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerComparison from "@/components/PlayerComparison";
import PremiumUpsell from "@/components/PremiumUpsell";
import { SkeletonCardsGrid } from "@/components/LoadingSkeleton";

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
  ranked: boolean;
}

export default function ComparePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="mb-4">
        <h1 className="text-2xl font-black">⚔️ Player Comparison</h1>
        <p className="mt-0.5 text-xs text-zinc-500">Select two players to compare stats head-to-head.</p>
      </div>

      {loading ? (
        <SkeletonCardsGrid count={2} />
      ) : (
        <>
          {/* Player selectors */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-4">
            <div className="rounded-xl border border-orange-700/30 bg-orange-950/10 p-4">
              <p className="mb-2.5 text-xs font-bold text-orange-300 uppercase tracking-wider">Player A</p>
              <PlayerSearch
                players={players}
                onSelect={setPlayerA}
                placeholder="Search for Player A…"
              />
              {playerA && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="text-green-400">✓</span>
                  <span className="font-bold text-white">{playerA.name}</span>
                  <span>selected</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-4">
              <p className="mb-2.5 text-xs font-bold text-blue-300 uppercase tracking-wider">Player B</p>
              <PlayerSearch
                players={players}
                onSelect={setPlayerB}
                placeholder="Search for Player B…"
              />
              {playerB && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="text-green-400">✓</span>
                  <span className="font-bold text-white">{playerB.name}</span>
                  <span>selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Comparison result */}
          {playerA && playerB ? (
            playerA.user_id === playerB.user_id ? (
              <div className="rounded-xl border border-yellow-700/30 bg-yellow-950/15 p-4 text-center">
                <p className="text-sm text-yellow-300 font-bold">⚠️ Please select two different players to compare.</p>
              </div>
            ) : (
              <PlayerComparison playerA={playerA} playerB={playerB} />
            )
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d14] p-10 text-center">
              <p className="text-4xl mb-3">⚔️</p>
              <p className="text-base font-black text-zinc-400">Select two players above to begin</p>
              <p className="mt-1 text-xs text-zinc-600">Search by name or username</p>
            </div>
          )}

          <div className="mt-4">
            <PremiumUpsell
              compact
              message="Save comparisons and view comparison history with Premium."
            />
          </div>
        </>
      )}
    </Shell>
  );
}
