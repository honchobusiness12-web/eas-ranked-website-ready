"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerComparison from "@/components/PlayerComparison";
import { SkeletonCardsGrid } from "@/components/LoadingSkeleton";
import { useTheme } from "@/components/ThemeProvider";

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
  const { theme } = useTheme();
  const isLight = theme === "light";

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
      <div className="mb-6">
        <h1 className="text-4xl font-black">⚔️ Player Comparison</h1>
        <p className={`mt-2 ${isLight ? "text-[#7070a0]" : "text-zinc-400"}`}>Select two players to compare their stats head-to-head.</p>
      </div>

      {loading ? (
        <SkeletonCardsGrid count={2} />
      ) : (
        <>
          {/* Player selectors */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-8">
            <div className={`rounded-2xl border p-5 ${
              isLight
                ? "border-purple-400/40 bg-purple-50 shadow-sm"
                : "border-purple-700/40 bg-purple-950/10"
            }`}>
              <p className={`mb-3 text-sm font-bold ${isLight ? "text-purple-700" : "text-purple-300"}`}>Player A</p>
              <PlayerSearch
                players={players}
                onSelect={setPlayerA}
                placeholder="Search for Player A…"
              />
              {playerA && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${isLight ? "text-[#3d3d5c]" : "text-zinc-400"}`}>
                  <span className="text-green-600">✓</span>
                  <span className={`font-bold ${isLight ? "text-[#0f0f1a]" : "text-white"}`}>{playerA.name}</span>
                  <span>selected</span>
                </div>
              )}
            </div>

            <div className={`rounded-2xl border p-5 ${
              isLight
                ? "border-blue-400/40 bg-blue-50 shadow-sm"
                : "border-blue-700/40 bg-blue-950/10"
            }`}>
              <p className={`mb-3 text-sm font-bold ${isLight ? "text-blue-700" : "text-blue-300"}`}>Player B</p>
              <PlayerSearch
                players={players}
                onSelect={setPlayerB}
                placeholder="Search for Player B…"
              />
              {playerB && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${isLight ? "text-[#3d3d5c]" : "text-zinc-400"}`}>
                  <span className="text-green-600">✓</span>
                  <span className={`font-bold ${isLight ? "text-[#0f0f1a]" : "text-white"}`}>{playerB.name}</span>
                  <span>selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Comparison result */}
          {playerA && playerB ? (
            playerA.user_id === playerB.user_id ? (
              <div className={`rounded-2xl border p-6 text-center ${
                isLight
                  ? "border-yellow-400/50 bg-yellow-50"
                  : "border-yellow-700/40 bg-yellow-950/20"
              }`}>
                <p className={`font-bold ${isLight ? "text-yellow-700" : "text-yellow-300"}`}>⚠️ Please select two different players to compare.</p>
              </div>
            ) : (
              <PlayerComparison playerA={playerA} playerB={playerB} />
            )
          ) : (
            <div className={`rounded-2xl border p-12 text-center ${
              isLight ? "border-black/10 bg-white shadow-sm" : "border-white/10 bg-[#0d0d14]"
            }`}>
              <p className="text-5xl mb-4">⚔️</p>
              <p className={`text-xl font-black ${isLight ? "text-[#7070a0]" : "text-zinc-400"}`}>Select two players above to begin comparison</p>
              <p className={`mt-2 text-sm ${isLight ? "text-[#9090b8]" : "text-zinc-600"}`}>Search by name or username</p>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
