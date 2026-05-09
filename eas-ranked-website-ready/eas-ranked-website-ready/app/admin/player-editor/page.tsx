"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerResult {
  user_id: string;
  name: string;
  username: string | null;
  cr: number;
  wins: number;
  losses: number;
  ranked: boolean;
}

interface AuditEntry {
  id: string;
  user_id: string;
  old_cr: number | null;
  new_cr: number | null;
  changed_by: string;
  reason: string;
  changed_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlayerEditorPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Search
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlayerResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected player
  const [selected, setSelected] = useState<PlayerResult | null>(null);

  // Edit form
  const [newCr, setNewCr] = useState<string>("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Recent changes
  const [recentChanges, setRecentChanges] = useState<AuditEntry[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentMinutes, setRecentMinutes] = useState(60);

  // Restore
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Auth check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.user) {
          setAuthChecked(true);
          return;
        }
        const check = await fetch("/api/giveaway/list");
        setIsOwner(check.ok);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // ---------------------------------------------------------------------------
  // Load recent changes
  // ---------------------------------------------------------------------------

  const loadRecentChanges = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/admin/recent-changes?minutes=${recentMinutes}`);
      if (res.ok) {
        const data = await res.json();
        setRecentChanges(data.changes ?? []);
      }
    } finally {
      setLoadingRecent(false);
    }
  }, [recentMinutes]);

  useEffect(() => {
    if (isOwner) loadRecentChanges();
  }, [isOwner, loadRecentChanges]);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelected(null);
    setEditMsg(null);

    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
        if (!Array.isArray(data) || data.length === 0) {
          setSearchError("No players found matching that query.");
        }
      } else {
        setSearchError("Search failed. Please try again.");
      }
    } catch {
      setSearchError("An unexpected error occurred.");
    } finally {
      setSearching(false);
    }
  }

  function selectPlayer(player: PlayerResult) {
    setSelected(player);
    setNewCr(String(player.cr));
    setReason("");
    setConfirmed(false);
    setEditMsg(null);
    setRestoreMsg(null);
  }

  // ---------------------------------------------------------------------------
  // Submit edit
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !confirmed) return;

    const parsedCr = parseInt(newCr, 10);
    if (isNaN(parsedCr) || parsedCr < 0 || parsedCr > 99999) {
      setEditMsg({ type: "error", text: "CR must be a whole number between 0 and 99,999." });
      return;
    }

    setSubmitting(true);
    setEditMsg(null);

    try {
      const res = await fetch("/api/admin/player-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.user_id,
          newCr: parsedCr,
          reason: reason.trim(),
          confirmed: true,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEditMsg({
          type: "success",
          text: `✅ Updated ${selected.name}'s CR from ${selected.cr} → ${parsedCr}.`,
        });
        // Update local state
        setSelected({ ...selected, cr: parsedCr });
        setSearchResults((prev) =>
          prev.map((p) => (p.user_id === selected.user_id ? { ...p, cr: parsedCr } : p))
        );
        setConfirmed(false);
        setReason("");
        loadRecentChanges();
      } else {
        setEditMsg({ type: "error", text: data.error ?? "Failed to update player." });
      }
    } catch {
      setEditMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Restore
  // ---------------------------------------------------------------------------

  async function handleRestore(minutesAgo: number) {
    if (!selected) return;
    if (
      !confirm(
        `Restore ${selected.name} to their state from ${minutesAgo} minutes ago? This will overwrite their current data.`
      )
    )
      return;

    setRestoring(true);
    setRestoreMsg(null);

    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: [selected.user_id], fromMinutesAgo: minutesAgo }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const result = data.results?.[0];
        if (result?.status === "restored") {
          setRestoreMsg({
            type: "success",
            text: `✅ Restored ${selected.name} to CR ${result.restoredCr ?? "?"} (was ${result.currentCr ?? "?"}).`,
          });
          if (result.restoredCr !== undefined && result.restoredCr !== null) {
            setSelected({ ...selected, cr: result.restoredCr });
          }
          loadRecentChanges();
        } else {
          setRestoreMsg({
            type: "error",
            text: result?.message ?? "No snapshot found for that time window.",
          });
        }
      } else {
        setRestoreMsg({ type: "error", text: data.error ?? "Restore failed." });
      }
    } catch {
      setRestoreMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setRestoring(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Checking access…</p>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🚫</p>
            <h1 className="text-2xl font-black text-red-400">Access Denied</h1>
            <p className="mt-2 text-zinc-400">This page is restricted to EAS Arena owners.</p>
            <SoundLink
              href="/"
              soundType="click"
              className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
            >
              ← Back to Dashboard
            </SoundLink>
          </div>
        </div>
      </Shell>
    );
  }

  const parsedNewCr = parseInt(newCr, 10);
  const crChanged = selected && !isNaN(parsedNewCr) && parsedNewCr !== selected.cr;
  const canSubmit =
    selected &&
    confirmed &&
    reason.trim().length >= 3 &&
    !isNaN(parsedNewCr) &&
    parsedNewCr >= 0 &&
    parsedNewCr <= 99999 &&
    crChanged;

  return (
    <Shell>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black">🔧 Player Editor</h1>
          <p className="mt-2 text-zinc-400">
            Safely edit player CR with full audit logging. Owner access only.
          </p>
        </div>
        <SoundLink
          href="/admin/player-history"
          soundType="click"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
        >
          📋 Full Audit Log
        </SoundLink>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------------------------ */}
        {/* Left column — search + edit form                                    */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-6">
          {/* Search */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-lg font-black">🔍 Find Player</h2>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username or ID…"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? "…" : "Search"}
              </button>
            </form>

            {searchError && (
              <p className="mt-3 text-sm text-red-400">{searchError}</p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => selectPlayer(p)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selected?.user_id === p.user_id
                        ? "border-orange-600/60 bg-orange-950/20 text-white"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black">{p.name}</span>
                        {p.username && (
                          <span className="ml-2 text-zinc-500">@{p.username}</span>
                        )}
                      </div>
                      <span className="font-mono font-black text-orange-400">
                        CR {p.cr.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-zinc-600">{p.user_id}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edit form */}
          {selected && (
            <div className="rounded-2xl border border-orange-700/30 bg-gradient-to-br from-orange-950/20 to-black p-6">
              <h2 className="mb-1 text-lg font-black">✏️ Edit Player</h2>
              <p className="mb-5 text-sm text-zinc-400">
                Editing{" "}
                <span className="font-black text-white">{selected.name}</span>
                <span className="ml-2 font-mono text-xs text-zinc-600">
                  {selected.user_id}
                </span>
              </p>

              {/* Current stats */}
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Current CR", value: selected.cr.toLocaleString() },
                  { label: "Wins", value: selected.wins },
                  { label: "Losses", value: selected.losses },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New CR */}
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                    New CR Value
                  </label>
                  <input
                    type="number"
                    value={newCr}
                    onChange={(e) => {
                      setNewCr(e.target.value);
                      setConfirmed(false);
                    }}
                    min={0}
                    max={99999}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white focus:border-orange-600/60 focus:outline-none"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                    Reason for Change{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Correcting data entry error from match #1234"
                    rows={2}
                    required
                    minLength={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
                  />
                </div>

                {/* Preview */}
                {crChanged && (
                  <div className="rounded-xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-3">
                    <p className="text-sm font-black text-yellow-300">
                      ⚠️ Preview: {selected.name}&apos;s CR will change from{" "}
                      <span className="text-red-400">{selected.cr.toLocaleString()}</span>
                      {" → "}
                      <span className="text-green-400">{parsedNewCr.toLocaleString()}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Δ {parsedNewCr > selected.cr ? "+" : ""}
                      {(parsedNewCr - selected.cr).toLocaleString()} CR
                    </p>
                  </div>
                )}

                {/* Confirmation checkbox */}
                {crChanged && reason.trim().length >= 3 && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-orange-500"
                    />
                    <span className="text-sm text-zinc-300">
                      I understand this will change{" "}
                      <strong className="text-white">{selected.name}</strong>
                      &apos;s CR from{" "}
                      <strong className="text-red-400">{selected.cr.toLocaleString()}</strong>
                      {" to "}
                      <strong className="text-green-400">{parsedNewCr.toLocaleString()}</strong>
                      {" "}and this action will be logged.
                    </span>
                  </label>
                )}

                {/* Feedback */}
                {editMsg && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                      editMsg.type === "success"
                        ? "border-green-700/40 bg-green-950/20 text-green-300"
                        : "border-red-700/40 bg-red-950/20 text-red-300"
                    }`}
                  >
                    {editMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-red-600 py-3 font-black text-white hover:from-orange-500 hover:to-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Applying…" : "Apply Change →"}
                </button>
              </form>

              {/* Restore section */}
              <div className="mt-6 border-t border-white/10 pt-5">
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-zinc-400">
                  🔄 Emergency Restore
                </h3>
                <p className="mb-3 text-xs text-zinc-500">
                  Restore this player to their state from the audit log.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 60, 120, 1440].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleRestore(mins)}
                      disabled={restoring}
                      className="rounded-lg border border-blue-700/40 bg-blue-950/20 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-950/40 transition disabled:opacity-50"
                    >
                      {mins < 60
                        ? `${mins}m ago`
                        : mins < 1440
                        ? `${mins / 60}h ago`
                        : "24h ago"}
                    </button>
                  ))}
                </div>
                {restoreMsg && (
                  <div
                    className={`mt-3 rounded-xl border px-4 py-3 text-sm font-bold ${
                      restoreMsg.type === "success"
                        ? "border-green-700/40 bg-green-950/20 text-green-300"
                        : "border-red-700/40 bg-red-950/20 text-red-300"
                    }`}
                  >
                    {restoreMsg.text}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Right column — recent changes log                                   */}
        {/* ------------------------------------------------------------------ */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-black">📋 Recent Changes</h2>
            <div className="flex items-center gap-2">
              <select
                value={recentMinutes}
                onChange={(e) => setRecentMinutes(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-[#0d0d14] px-2 py-1 text-xs text-zinc-300 focus:outline-none"
              >
                <option value={30}>Last 30m</option>
                <option value={60}>Last 1h</option>
                <option value={360}>Last 6h</option>
                <option value={1440}>Last 24h</option>
                <option value={10080}>Last 7d</option>
              </select>
              <button
                onClick={loadRecentChanges}
                disabled={loadingRecent}
                className="rounded-lg border border-white/10 px-3 py-1 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
              >
                {loadingRecent ? "…" : "↻"}
              </button>
            </div>
          </div>

          {loadingRecent && recentChanges.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 animate-pulse">
              Loading changes…
            </div>
          ) : recentChanges.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">
              No changes in this time window.
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-white/5">
              {recentChanges.map((entry) => (
                <div key={entry.id} className="px-6 py-4 hover:bg-white/5 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-zinc-500">{entry.user_id}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {entry.old_cr !== null && entry.new_cr !== null ? (
                          <>
                            <span className="font-mono text-sm font-black text-red-400">
                              {entry.old_cr.toLocaleString()}
                            </span>
                            <span className="text-zinc-600">→</span>
                            <span className="font-mono text-sm font-black text-green-400">
                              {entry.new_cr.toLocaleString()}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                entry.new_cr > entry.old_cr
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              ({entry.new_cr > entry.old_cr ? "+" : ""}
                              {(entry.new_cr - entry.old_cr).toLocaleString()})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-500">Data change</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 italic truncate">
                        &ldquo;{entry.reason}&rdquo;
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-zinc-600">{fmt(entry.changed_at)}</p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-600">
                        by {entry.changed_by}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
