"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumUpsell from "@/components/PremiumUpsell";

interface Snapshot {
  id: string;
  takenAt: string;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  label?: string;
}

interface Goal {
  id: string;
  type: "cr" | "wins" | "win_rate";
  target: number;
  createdAt: string;
  label: string;
}

export default function TrackerPage() {
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [checking, setChecking] = useState(false);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalType, setGoalType] = useState<"cr" | "wins" | "win_rate">("cr");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalLabel, setGoalLabel] = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const storedSnaps = localStorage.getItem("eas_snapshots");
      const storedGoals = localStorage.getItem("eas_goals");
      if (storedSnaps) setSnapshots(JSON.parse(storedSnaps));
      if (storedGoals) setGoals(JSON.parse(storedGoals));
    } catch {}
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    const uid = inputId.trim();
    setUserId(uid);
    setChecking(true);

    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch(`/api/premium/status?userId=${uid}`),
        fetch(`/api/premium/stats?userId=${uid}`),
      ]);
      const statusData = await statusRes.json();
      setIsPremium(statusData.premium ?? false);
      if (statusData.premium && statsRes.ok) {
        const statsData = await statsRes.json();
        setCurrentStats(statsData.stats ?? null);
      }
    } catch {
      setIsPremium(false);
    } finally {
      setChecking(false);
    }
  }

  function takeSnapshot() {
    if (!currentStats) return;
    const snap: Snapshot = {
      id: `${Date.now()}`,
      takenAt: new Date().toISOString(),
      cr: currentStats.cr,
      wins: currentStats.wins,
      losses: currentStats.losses,
      kills: currentStats.kills,
      matches: currentStats.matches,
      label: snapshotLabel || undefined,
    };
    const updated = [snap, ...snapshots].slice(0, 30);
    setSnapshots(updated);
    try { localStorage.setItem("eas_snapshots", JSON.stringify(updated)); } catch {}
    setSnapshotLabel("");
    setMsg("✅ Snapshot saved!");
    setTimeout(() => setMsg(""), 3000);
  }

  function addGoal() {
    if (!goalTarget || isNaN(Number(goalTarget))) return;
    const goal: Goal = {
      id: `${Date.now()}`,
      type: goalType,
      target: Number(goalTarget),
      createdAt: new Date().toISOString(),
      label: goalLabel || `${goalType.toUpperCase()} Goal`,
    };
    const updated = [...goals, goal];
    setGoals(updated);
    try { localStorage.setItem("eas_goals", JSON.stringify(updated)); } catch {}
    setGoalTarget("");
    setGoalLabel("");
    setMsg("✅ Goal added!");
    setTimeout(() => setMsg(""), 3000);
  }

  function deleteGoal(id: string) {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    try { localStorage.setItem("eas_goals", JSON.stringify(updated)); } catch {}
  }

  function deleteSnapshot(id: string) {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    try { localStorage.setItem("eas_snapshots", JSON.stringify(updated)); } catch {}
  }

  function getGoalProgress(goal: Goal): { current: number; pct: number } {
    if (!currentStats) return { current: 0, pct: 0 };
    let current = 0;
    if (goal.type === "cr") current = currentStats.cr;
    else if (goal.type === "wins") current = currentStats.wins;
    else if (goal.type === "win_rate") current = currentStats.win_rate;
    const pct = Math.min(100, Math.round((current / goal.target) * 100));
    return { current, pct };
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🎯 Progress Tracker</h1>
          <p className="mt-2 text-zinc-400">Track your improvement, set goals, and view milestones.</p>
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

      {userId && !isPremium && !checking && (
        <PremiumUpsell message="Track your progress over time, set CR goals, and take stat snapshots with Premium." />
      )}

      {msg && (
        <div className="mb-4 rounded-xl border border-green-700/40 bg-green-950/20 p-3 text-sm text-green-400">
          {msg}
        </div>
      )}

      {isPremium && userId && !checking && (
        <div className="space-y-6 animate-fade-in">
          {/* Current stats */}
          {currentStats && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">📊 Current Stats</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={snapshotLabel}
                    onChange={(e) => setSnapshotLabel(e.target.value)}
                    placeholder="Snapshot label (optional)"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-yellow-600/60 focus:outline-none"
                  />
                  <button
                    onClick={takeSnapshot}
                    className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
                  >
                    📸 Snapshot
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "CR", value: currentStats.cr.toLocaleString(), color: "text-orange-400" },
                  { label: "Win Rate", value: `${currentStats.win_rate}%`, color: "text-green-400" },
                  { label: "Wins", value: currentStats.wins, color: "text-green-400" },
                  { label: "Matches", value: currentStats.matches, color: "text-zinc-300" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className={`mt-1 text-xl font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">🎯 Goals</h2>

            {/* Add goal */}
            <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as any)}
                className="rounded-xl border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white focus:border-yellow-600/60 focus:outline-none"
              >
                <option value="cr">CR Target</option>
                <option value="wins">Wins Target</option>
                <option value="win_rate">Win Rate % Target</option>
              </select>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="Target value"
                className="w-32 rounded-xl border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-yellow-600/60 focus:outline-none"
              />
              <input
                type="text"
                value={goalLabel}
                onChange={(e) => setGoalLabel(e.target.value)}
                placeholder="Label (optional)"
                className="flex-1 rounded-xl border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-yellow-600/60 focus:outline-none"
              />
              <button
                onClick={addGoal}
                className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
              >
                Add Goal
              </button>
            </div>

            {goals.length === 0 ? (
              <p className="text-zinc-500 text-sm">No goals set yet. Add a goal above to start tracking.</p>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const { current, pct } = getGoalProgress(goal);
                  const achieved = pct >= 100;
                  return (
                    <div key={goal.id} className={`rounded-xl border p-4 ${achieved ? "border-green-700/40 bg-green-950/10" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-black text-sm">{goal.label}</p>
                          <p className="text-xs text-zinc-500">
                            {goal.type === "cr" ? "CR" : goal.type === "wins" ? "Wins" : "Win Rate %"} → {goal.target.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {achieved && <span className="text-green-400 font-black text-sm">✅ Achieved!</span>}
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 rounded-full bg-zinc-800">
                          <div
                            className="h-3 rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: achieved
                                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                                : "linear-gradient(90deg, #f97316, #FFD700)",
                            }}
                          />
                        </div>
                        <span className="text-sm font-black text-zinc-300 w-12 text-right">{pct}%</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Current: <span className="text-white font-bold">{current.toLocaleString()}</span> / {goal.target.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Snapshots */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">📸 Stat Snapshots</h2>
            {snapshots.length === 0 ? (
              <p className="text-zinc-500 text-sm">No snapshots yet. Click &quot;Snapshot&quot; above to save your current stats.</p>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snap, i) => {
                  const prev = snapshots[i + 1];
                  const crDiff = prev ? snap.cr - prev.cr : null;
                  return (
                    <div key={snap.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-black text-sm">{snap.label || `Snapshot #${snapshots.length - i}`}</p>
                          <p className="text-xs text-zinc-500">
                            {new Date(snap.takenAt).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {crDiff !== null && (
                            <span className={`text-sm font-black ${crDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {crDiff >= 0 ? "+" : ""}{crDiff} CR
                            </span>
                          )}
                          <button
                            onClick={() => deleteSnapshot(snap.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                        <span>CR: <span className="text-orange-400 font-bold">{snap.cr.toLocaleString()}</span></span>
                        <span>Wins: <span className="text-green-400 font-bold">{snap.wins}</span></span>
                        <span>Losses: <span className="text-red-400 font-bold">{snap.losses}</span></span>
                        <span>Matches: <span className="text-zinc-300 font-bold">{snap.matches}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!userId && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-5xl mb-4">🎯</p>
          <h2 className="text-xl font-black text-zinc-300">Enter your Discord User ID to start tracking</h2>
          <p className="mt-2 text-sm text-zinc-500">Set goals, take snapshots, and track your progress over time.</p>
        </div>
      )}
    </Shell>
  );
}
