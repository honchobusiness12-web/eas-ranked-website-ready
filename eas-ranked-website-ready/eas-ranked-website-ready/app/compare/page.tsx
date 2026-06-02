"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerComparison from "@/components/PlayerComparison";
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
      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
          style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.18), rgba(77,238,234,0.12))", border: "1px solid rgba(0,207,255,0.28)", boxShadow: "0 0 20px rgba(0,207,255,0.15)" }}
        >⚔️</div>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#e2f4ff" }}>Player Comparison</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(168,255,246,0.55)" }}>Select two players to compare their stats head-to-head.</p>
        </div>
      </div>

      {loading ? (
        <SkeletonCardsGrid count={2} />
      ) : (
        <>
          {/* ── Player selectors ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
            <div className="compare-card animate-card-entrance" style={{ borderColor: "rgba(0,207,255,0.28)", background: "linear-gradient(135deg, rgba(0,207,255,0.08), rgba(6,43,69,0.85))" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black" style={{ background: "rgba(0,207,255,0.15)", border: "1px solid rgba(0,207,255,0.30)", color: "#00CFFF" }}>A</div>
                <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "#00CFFF" }}>Player A</p>
              </div>
              <PlayerSearch
                players={players}
                onSelect={setPlayerA}
                placeholder="Search for Player A…"
              />
              {playerA && (
                <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.20)" }}>
                  <span style={{ color: "#4ade80" }}>✓</span>
                  <span className="text-sm font-bold" style={{ color: "#e2f4ff" }}>{playerA.name}</span>
                  <span className="text-xs" style={{ color: "rgba(168,255,246,0.55)" }}>selected</span>
                </div>
              )}
            </div>

            <div className="compare-card animate-card-entrance" style={{ animationDelay: "60ms", borderColor: "rgba(77,238,234,0.28)", background: "linear-gradient(135deg, rgba(77,238,234,0.08), rgba(6,43,69,0.85))" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black" style={{ background: "rgba(77,238,234,0.15)", border: "1px solid rgba(77,238,234,0.30)", color: "#4DEEEA" }}>B</div>
                <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "#4DEEEA" }}>Player B</p>
              </div>
              <PlayerSearch
                players={players}
                onSelect={setPlayerB}
                placeholder="Search for Player B…"
              />
              {playerB && (
                <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(77,238,234,0.08)", border: "1px solid rgba(77,238,234,0.20)" }}>
                  <span style={{ color: "#4ade80" }}>✓</span>
                  <span className="text-sm font-bold" style={{ color: "#e2f4ff" }}>{playerB.name}</span>
                  <span className="text-xs" style={{ color: "rgba(168,255,246,0.55)" }}>selected</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Comparison result ── */}
          {playerA && playerB ? (
            playerA.user_id === playerB.user_id ? (
              <div className="rounded-2xl p-5 text-center animate-card-entrance" style={{ border: "1px solid rgba(251,191,36,0.30)", background: "rgba(251,191,36,0.08)" }}>
                <p className="text-base font-bold" style={{ color: "#fbbf24" }}>⚠️ Please select two different players to compare.</p>
              </div>
            ) : (
              <PlayerComparison playerA={playerA} playerB={playerB} />
            )
          ) : (
            <div className="empty-state-premium animate-card-entrance" style={{ animationDelay: "120ms" }}>
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl animate-float" style={{ background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.18)" }}>⚔️</div>
              <p className="text-lg font-black" style={{ color: "#e2f4ff" }}>Select two players above to begin</p>
              <p className="mt-2 text-sm" style={{ color: "rgba(168,255,246,0.55)" }}>Search by name or username to compare stats head-to-head</p>
            </div>
          )}

        </>
      )}
    </Shell>
  );
}
