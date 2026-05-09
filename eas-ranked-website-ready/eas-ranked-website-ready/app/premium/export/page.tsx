"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumUpsell from "@/components/PremiumUpsell";

interface PlayerStats {
  name: string;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  win_rate: number;
  kda: number;
}

export default function ExportPage() {
  const [sessionUserId, setSessionUserId] = useState("");
  const [sessionIsPremium, setSessionIsPremium] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportMsg, setExportMsg] = useState("");

  // Load the authenticated user's session on mount and pre-fill the input
  useEffect(() => {
    setSessionLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const uid: string = data.user.id;
          setSessionUserId(uid);
          setInputId(uid);
          return fetch(`/api/premium/status?userId=${uid}`)
            .then((r) => r.json())
            .then((s) => setSessionIsPremium(s.premium ?? false));
        }
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, []);

  // Whether the currently loaded stats belong to the authenticated user
  const isOwnStats = sessionUserId !== "" && userId === sessionUserId;

  // Gate: must be logged in and have premium
  if (!sessionLoading && sessionUserId && !sessionIsPremium) {
    return (
      <Shell>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">📥 Export Stats</h1>
            <p className="mt-2 text-zinc-400">Download your player stats in multiple formats.</p>
          </div>
          <PremiumBadge size="lg" />
        </div>
        <PremiumUpsell message="Export your stats as CSV, JSON, or text with Premium. Download your full performance data anytime." />
      </Shell>
    );
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    const uid = inputId.trim();

    // Only allow exporting own stats
    if (sessionUserId && uid !== sessionUserId) {
      setError("You can only export your own stats. Please enter your own Discord User ID.");
      return;
    }

    setUserId(uid);
    setChecking(true);
    setError("");
    setStats(null);

    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch(`/api/premium/status?userId=${uid}`),
        fetch(`/api/premium/stats?userId=${uid}`),
      ]);
      const statusData = await statusRes.json();
      setIsPremium(statusData.premium ?? false);

      if (statusData.premium && statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          setStats({
            name: uid,
            ...statsData.stats,
          });
        }
      }
    } catch {
      setError("Failed to load data.");
    } finally {
      setChecking(false);
    }
  }

  function exportCSV() {
    if (!stats) return;
    const headers = ["Name", "CR", "Wins", "Losses", "Kills", "Matches", "MVPs", "Win Rate %", "KDA"];
    const values = [
      stats.name,
      stats.cr,
      stats.wins,
      stats.losses,
      stats.kills,
      stats.matches,
      stats.mvp_count,
      stats.win_rate,
      stats.kda,
    ];
    const csv = [headers.join(","), values.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eas-stats-${userId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg("✅ CSV exported successfully!");
  }

  function exportJSON() {
    if (!stats) return;
    const json = JSON.stringify({ userId, exportedAt: new Date().toISOString(), stats }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eas-stats-${userId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg("✅ JSON exported successfully!");
  }

  function exportText() {
    if (!stats) return;
    const text = [
      `EAS Arena Stats Export`,
      `Generated: ${new Date().toLocaleString()}`,
      `User ID: ${userId}`,
      ``,
      `=== STATS ===`,
      `CR:          ${stats.cr.toLocaleString()}`,
      `Wins:        ${stats.wins}`,
      `Losses:      ${stats.losses}`,
      `Win Rate:    ${stats.win_rate}%`,
      `Kills:       ${stats.kills.toLocaleString()}`,
      `Matches:     ${stats.matches}`,
      `MVPs:        ${stats.mvp_count}`,
      `KDA:         ${stats.kda}`,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eas-stats-${userId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg("✅ Text file exported successfully!");
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">📥 Export Stats</h1>
          <p className="mt-2 text-zinc-400">Download your player stats in multiple formats.</p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* Session info */}
      {!sessionLoading && (
        <div className={`rounded-2xl border p-4 mb-6 flex items-center gap-3 ${sessionUserId ? "border-white/10 bg-[#0d0d14]" : "border-yellow-700/40 bg-yellow-950/20"}`}>
          <span className="text-lg">{sessionUserId ? "🔒" : "⚠️"}</span>
          {sessionUserId ? (
            <p className="text-sm text-zinc-400">
              Signed in as{" "}
              <span className="text-zinc-300 font-mono text-xs">{sessionUserId}</span>
              {sessionIsPremium ? (
                <span className="ml-2 text-yellow-400 font-bold text-xs">💎 Premium</span>
              ) : (
                <span className="ml-2 text-zinc-500 text-xs">(no premium)</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-yellow-300 font-bold">
              You must be signed in to export stats.
            </p>
          )}
          <p className="ml-auto text-xs text-zinc-600">You can only export your own stats.</p>
        </div>
      )}

      {/* Lookup */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
        <h2 className="mb-3 text-lg font-black">🔍 Your Discord User ID</h2>
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
            disabled={checking || sessionLoading}
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? "Loading…" : "Load"}
          </button>
        </form>
        {isOwnStats && (
          <p className="mt-2 text-xs font-bold text-green-400">✅ Exporting your own stats</p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {userId && !isPremium && !checking && (
        <PremiumUpsell message="Export your stats as CSV, JSON, or text with Premium. Download your full performance data anytime." />
      )}

      {isPremium && stats && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats preview */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">📊 Stats Preview</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "CR", value: stats.cr.toLocaleString(), color: "text-orange-400" },
                { label: "Win Rate", value: `${stats.win_rate}%`, color: "text-green-400" },
                { label: "KDA", value: stats.kda.toFixed(2), color: "text-teal-400" },
                { label: "Matches", value: stats.matches.toString(), color: "text-zinc-300" },
                { label: "Wins", value: stats.wins.toString(), color: "text-green-400" },
                { label: "Losses", value: stats.losses.toString(), color: "text-red-400" },
                { label: "Kills", value: stats.kills.toLocaleString(), color: "text-yellow-400" },
                { label: "MVPs", value: stats.mvp_count.toString(), color: "text-yellow-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className={`mt-1 text-xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Export options */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">📤 Export Options</h2>
            {exportMsg && (
              <div className="mb-4 rounded-xl border border-green-700/40 bg-green-950/20 p-3 text-sm text-green-400">
                {exportMsg}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-green-700/30 bg-green-950/10 p-5">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-black text-green-300 mb-1">CSV Export</h3>
                <p className="text-xs text-zinc-400 mb-4">Spreadsheet-compatible format. Open in Excel, Google Sheets, etc.</p>
                <button
                  onClick={exportCSV}
                  className="w-full rounded-xl bg-green-700/30 border border-green-600/50 px-4 py-2.5 text-sm font-black text-green-300 hover:bg-green-700/50 transition"
                >
                  Download CSV
                </button>
              </div>

              <div className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-5">
                <div className="text-3xl mb-3">🔧</div>
                <h3 className="font-black text-blue-300 mb-1">JSON Export</h3>
                <p className="text-xs text-zinc-400 mb-4">Developer-friendly format. Use with APIs or custom tools.</p>
                <button
                  onClick={exportJSON}
                  className="w-full rounded-xl bg-blue-700/30 border border-blue-600/50 px-4 py-2.5 text-sm font-black text-blue-300 hover:bg-blue-700/50 transition"
                >
                  Download JSON
                </button>
              </div>

              <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/30 p-5">
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-black text-zinc-300 mb-1">Text Export</h3>
                <p className="text-xs text-zinc-400 mb-4">Plain text summary. Easy to share in Discord or messages.</p>
                <button
                  onClick={exportText}
                  className="w-full rounded-xl bg-zinc-700/30 border border-zinc-600/50 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-zinc-700/50 transition"
                >
                  Download TXT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!userId && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-5xl mb-4">📥</p>
          <h2 className="text-xl font-black text-zinc-300">Enter your Discord User ID to export your stats</h2>
          <p className="mt-2 text-sm text-zinc-500">Premium members can export stats as CSV, JSON, or text.</p>
        </div>
      )}
    </Shell>
  );
}
