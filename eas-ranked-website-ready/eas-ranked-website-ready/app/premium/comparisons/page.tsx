"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumUpsell from "@/components/PremiumUpsell";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerComparison from "@/components/PlayerComparison";

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

interface SavedComparison {
  id: string;
  playerA: Player;
  playerB: Player;
  savedAt: string;
  label?: string;
}

export default function ComparisonsPage() {
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [checking, setChecking] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);
  const [saved, setSaved] = useState<SavedComparison[]>([]);
  const [activeComparison, setActiveComparison] = useState<SavedComparison | null>(null);

  useEffect(() => {
    setLoadingPlayers(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingPlayers(false));

    // Load saved comparisons from localStorage
    try {
      const stored = localStorage.getItem("eas_saved_comparisons");
      if (stored) setSaved(JSON.parse(stored));
    } catch {}
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    const uid = inputId.trim();
    setUserId(uid);
    setChecking(true);
    try {
      const res = await fetch(`/api/premium/status?userId=${uid}`);
      const data = await res.json();
      setIsPremium(data.premium ?? false);
    } catch {
      setIsPremium(false);
    } finally {
      setChecking(false);
    }
  }

  function saveComparison() {
    if (!playerA || !playerB) return;
    const newComp: SavedComparison = {
      id: `${Date.now()}`,
      playerA,
      playerB,
      savedAt: new Date().toISOString(),
      label: `${playerA.name} vs ${playerB.name}`,
    };
    const updated = [newComp, ...saved].slice(0, 20); // keep last 20
    setSaved(updated);
    try {
      localStorage.setItem("eas_saved_comparisons", JSON.stringify(updated));
    } catch {}
  }

  function deleteComparison(id: string) {
    const updated = saved.filter((c) => c.id !== id);
    setSaved(updated);
    try {
      localStorage.setItem("eas_saved_comparisons", JSON.stringify(updated));
    } catch {}
    if (activeComparison?.id === id) setActiveComparison(null);
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">⚔️ Comparison History</h1>
          <p className="mt-2 text-zinc-400">Save and revisit your favourite player comparisons.</p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* User ID lookup */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
        <h2 className="mb-3 text-lg font-black">🔍 Verify Premium Status</h2>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="Discord User ID (e.g. 123456789012345678)"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-yellow-600/60 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            {checking ? "Checking…" : "Verify"}
          </button>
        </form>
      </div>

      {userId && !checking && !isPremium && (
        <PremiumUpsell message="Save and revisit player comparisons with Premium. Compare multiple players and build your comparison history." />
      )}

      {(!userId || (userId && !checking && isPremium)) && (
        <>
          {/* New comparison */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">⚔️ New Comparison</h2>
              {isPremium && playerA && playerB && playerA.user_id !== playerB.user_id && (
                <button
                  onClick={saveComparison}
                  className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
                >
                  💾 Save Comparison
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
              <div className="rounded-xl border border-orange-700/40 bg-orange-950/10 p-4">
                <p className="mb-3 text-sm font-bold text-orange-300">Player A</p>
                <PlayerSearch players={players} onSelect={setPlayerA} placeholder="Search for Player A…" />
                {playerA && (
                  <p className="mt-2 text-sm text-zinc-400">
                    <span className="text-green-400">✓</span> <span className="font-bold text-white">{playerA.name}</span>
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-blue-700/40 bg-blue-950/10 p-4">
                <p className="mb-3 text-sm font-bold text-blue-300">Player B</p>
                <PlayerSearch players={players} onSelect={setPlayerB} placeholder="Search for Player B…" />
                {playerB && (
                  <p className="mt-2 text-sm text-zinc-400">
                    <span className="text-green-400">✓</span> <span className="font-bold text-white">{playerB.name}</span>
                  </p>
                )}
              </div>
            </div>

            {playerA && playerB && playerA.user_id !== playerB.user_id && (
              <PlayerComparison playerA={playerA} playerB={playerB} />
            )}
            {playerA && playerB && playerA.user_id === playerB.user_id && (
              <div className="rounded-xl border border-yellow-700/40 bg-yellow-950/20 p-4 text-center">
                <p className="text-yellow-300 font-bold">⚠️ Please select two different players.</p>
              </div>
            )}
          </div>

          {/* Saved comparisons */}
          {isPremium && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <h2 className="mb-4 text-xl font-black">📚 Saved Comparisons</h2>
              {saved.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-zinc-400">No saved comparisons yet. Compare two players and click &quot;Save Comparison&quot;.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {saved.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-yellow-600/30 transition"
                    >
                      <div>
                        <p className="font-bold text-sm">{comp.label}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(comp.savedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setPlayerA(comp.playerA);
                            setPlayerB(comp.playerB);
                            setActiveComparison(comp);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="rounded-lg border border-yellow-600/50 px-3 py-1.5 text-xs font-bold text-yellow-300 hover:bg-yellow-950/30 transition"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteComparison(comp.id)}
                          className="rounded-lg border border-red-700/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-950/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
