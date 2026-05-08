"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumUpsell from "@/components/PremiumUpsell";

interface MatchEntry {
  index: number;
  raw: string;
  isWin: boolean;
  isLoss: boolean;
  delta: number | null;
}

export default function MatchHistoryPage() {
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [checking, setChecking] = useState(false);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "wins" | "losses">("all");

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    const uid = inputId.trim();
    setUserId(uid);
    setChecking(true);
    setError("");
    setMatches([]);

    try {
      const [statusRes, profileRes] = await Promise.all([
        fetch(`/api/premium/status?userId=${uid}`),
        fetch(`/api/profile/${uid}`),
      ]);
      const statusData = await statusRes.json();
      setIsPremium(statusData.premium ?? false);

      if (statusData.premium && profileRes.ok) {
        const profileData = await profileRes.json();
        const history: string[] = Array.isArray(profileData.history) ? profileData.history : [];
        const parsed: MatchEntry[] = history.map((raw, i) => {
          const isWin = raw.toLowerCase().includes("win") || raw.includes("+");
          const isLoss = raw.toLowerCase().includes("loss") || (raw.includes("-") && !raw.toLowerCase().includes("win"));
          const deltaMatch = raw.match(/([+-]\d+)\s*CR/i);
          const delta = deltaMatch ? parseInt(deltaMatch[1], 10) : null;
          return { index: i + 1, raw, isWin, isLoss, delta };
        });
        setMatches(parsed.reverse()); // newest first
      }
    } catch {
      setError("Failed to load match history.");
    } finally {
      setChecking(false);
    }
  }

  const filtered = matches.filter((m) => {
    if (filter === "wins") return m.isWin;
    if (filter === "losses") return m.isLoss;
    return true;
  });

  const totalWins = matches.filter((m) => m.isWin).length;
  const totalLosses = matches.filter((m) => m.isLoss).length;
  const netCr = matches.reduce((sum, m) => sum + (m.delta ?? 0), 0);

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">📜 Match History</h1>
          <p className="mt-2 text-zinc-400">Detailed match-by-match breakdown for Premium members.</p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* Lookup */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
        <h2 className="mb-3 text-lg font-black">🔍 Enter Your Discord User ID</h2>
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
            {checking ? "Loading…" : "Load"}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {userId && !isPremium && !checking && (
        <PremiumUpsell message="View your full match history with detailed analytics. Premium members get access to every match entry with filtering and CR tracking." />
      )}

      {isPremium && userId && !checking && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4">
              <p className="text-xs text-zinc-400">Total Entries</p>
              <p className="mt-2 text-2xl font-black text-zinc-300">{matches.length}</p>
            </div>
            <div className="rounded-2xl border border-green-800/30 bg-green-950/10 p-4">
              <p className="text-xs text-zinc-400">Wins</p>
              <p className="mt-2 text-2xl font-black text-green-400">{totalWins}</p>
            </div>
            <div className="rounded-2xl border border-red-800/30 bg-red-950/10 p-4">
              <p className="text-xs text-zinc-400">Losses</p>
              <p className="mt-2 text-2xl font-black text-red-400">{totalLosses}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${netCr >= 0 ? "border-green-800/30 bg-green-950/10" : "border-red-800/30 bg-red-950/10"}`}>
              <p className="text-xs text-zinc-400">Net CR</p>
              <p className={`mt-2 text-2xl font-black ${netCr >= 0 ? "text-green-400" : "text-red-400"}`}>
                {netCr >= 0 ? "+" : ""}{netCr}
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "wins", "losses"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition capitalize ${
                  filter === f
                    ? "border-yellow-500 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-yellow-600/40 hover:text-white"
                }`}
              >
                {f === "all" ? `All (${matches.length})` : f === "wins" ? `Wins (${totalWins})` : `Losses (${totalLosses})`}
              </button>
            ))}
          </div>

          {/* Match list */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-zinc-500">No match history found.</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {filtered.map((match, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between border-b border-white/5 px-5 py-3 ${
                      match.isWin
                        ? "hover:bg-green-950/10"
                        : match.isLoss
                        ? "hover:bg-red-950/10"
                        : "hover:bg-white/5"
                    } transition`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          match.isWin ? "bg-green-400" : match.isLoss ? "bg-red-400" : "bg-zinc-500"
                        }`}
                      />
                      <span className="text-sm text-zinc-300">{match.raw}</span>
                    </div>
                    {match.delta !== null && (
                      <span
                        className={`text-sm font-black shrink-0 ml-4 ${
                          match.delta > 0 ? "text-green-400" : match.delta < 0 ? "text-red-400" : "text-zinc-400"
                        }`}
                      >
                        {match.delta > 0 ? "+" : ""}{match.delta} CR
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!userId && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-5xl mb-4">📜</p>
          <h2 className="text-xl font-black text-zinc-300">Enter your Discord User ID to view match history</h2>
          <p className="mt-2 text-sm text-zinc-500">Premium members get full match history with filtering and analytics.</p>
        </div>
      )}
    </Shell>
  );
}
