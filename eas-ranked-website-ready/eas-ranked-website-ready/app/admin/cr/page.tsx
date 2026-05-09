"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import { getRank } from "@/lib/ranks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerInfo {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  cr: number;
}

interface AuditLog {
  id: string;
  player_id: string;
  player_name: string | null;
  old_cr: number;
  new_cr: number;
  edited_by: string;
  edited_at: string;
  reason: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTs(dateStr: string): string {
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

export default function CRAdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // --- Player lookup ---
  const [lookupId, setLookupId] = useState("");
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // --- Update form ---
  const [newCR, setNewCR] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Audit logs ---
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [logsFilter, setLogsFilter] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const LOGS_PER_PAGE = 10;

  // ---------------------------------------------------------------------------
  // Auth check on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // ---------------------------------------------------------------------------
  // Load audit logs
  // ---------------------------------------------------------------------------

  const loadLogs = useCallback(
    async (page = 0, filterPlayerId = "") => {
      setLoadingLogs(true);
      try {
        const params = new URLSearchParams({
          limit: String(LOGS_PER_PAGE),
          offset: String(page * LOGS_PER_PAGE),
        });
        if (filterPlayerId.trim()) params.set("playerId", filterPlayerId.trim());

        const res = await fetch(`/api/admin/cr/logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs ?? []);
          setLogsTotal(data.total ?? 0);
        }
      } finally {
        setLoadingLogs(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOwner) loadLogs(0, "");
  }, [isOwner, loadLogs]);

  // ---------------------------------------------------------------------------
  // Load player by Discord user ID
  // ---------------------------------------------------------------------------

  async function handleLoadPlayer(e: React.FormEvent) {
    e.preventDefault();
    const id = lookupId.trim();
    if (!id) return;

    setLoadingPlayer(true);
    setPlayer(null);
    setLookupError(null);
    setUpdateMsg(null);
    setNewCR("");
    setReason("");

    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setLookupError("No player found with that Discord user ID.");
        return;
      }
      if (!res.ok) {
        setLookupError("Failed to load player. Please try again.");
        return;
      }
      const data = await res.json();
      setPlayer({
        user_id: data.user_id,
        name: data.name,
        username: data.username ?? null,
        avatar_url: data.avatar_url ?? null,
        cr: data.cr ?? 0,
      });
    } catch {
      setLookupError("An unexpected error occurred.");
    } finally {
      setLoadingPlayer(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Submit CR update (after confirmation)
  // ---------------------------------------------------------------------------

  async function handleConfirmUpdate() {
    if (!player) return;
    setUpdating(true);
    setShowConfirm(false);
    setUpdateMsg(null);

    try {
      const res = await fetch("/api/admin/cr/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.user_id,
          newCR: Number(newCR),
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUpdateMsg({
          type: "success",
          text: `✅ CR updated successfully: ${data.oldCR} → ${data.newCR}`,
        });
        // Refresh player info to show new CR
        setPlayer((prev) => (prev ? { ...prev, cr: data.newCR } : prev));
        setNewCR("");
        setReason("");
        // Reload audit logs
        loadLogs(0, logsFilter);
        setLogsPage(0);
      } else {
        setUpdateMsg({ type: "error", text: `❌ ${data.error ?? "Failed to update CR."}` });
      }
    } catch {
      setUpdateMsg({ type: "error", text: "❌ An unexpected error occurred." });
    } finally {
      setUpdating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Logs pagination / filter
  // ---------------------------------------------------------------------------

  function handleLogsFilter(e: React.FormEvent) {
    e.preventDefault();
    setLogsPage(0);
    loadLogs(0, logsFilter);
  }

  function handleLogsPage(newPage: number) {
    setLogsPage(newPage);
    loadLogs(newPage, logsFilter);
  }

  // ---------------------------------------------------------------------------
  // Render: loading / access denied
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
            <p className="mt-2 text-zinc-400">This page is restricted to the EAS Arena developer.</p>
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

  const parsedNewCR = Number(newCR);
  const canSubmit =
    player !== null &&
    newCR.trim() !== "" &&
    !isNaN(parsedNewCR) &&
    Number.isInteger(parsedNewCR) &&
    parsedNewCR >= 0 &&
    parsedNewCR <= 9999 &&
    reason.trim().length > 0;

  const totalPages = Math.ceil(logsTotal / LOGS_PER_PAGE);

  // ---------------------------------------------------------------------------
  // Render: main page
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-4xl font-black">⚙️ CR Admin Panel</h1>
        <p className="mt-2 text-zinc-400">
          Update player Competitive Rating with full audit logging. Developer access only.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Update Player CR                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-orange-700/30 bg-gradient-to-br from-orange-950/20 to-black p-6 mb-8">
        <h2 className="mb-5 text-xl font-black text-orange-300">🎯 Update Player CR</h2>

        {/* Player lookup */}
        <form onSubmit={handleLoadPlayer} className="flex gap-3 mb-6">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Discord User ID (e.g. 123456789012345678)"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loadingPlayer || !lookupId.trim()}
            className="rounded-xl border border-orange-700/40 bg-orange-950/30 px-5 py-2.5 text-sm font-black text-orange-300 hover:bg-orange-950/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPlayer ? "Loading…" : "Load Player"}
          </button>
        </form>

        {/* Lookup error */}
        {lookupError && (
          <div className="mb-5 rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-300">
            {lookupError}
          </div>
        )}

        {/* Player card */}
        {player && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-4">
              {player.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.avatar_url}
                  alt={player.name}
                  className="h-12 w-12 rounded-full border border-white/10"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl">
                  👤
                </div>
              )}
              <div>
                <p className="font-black text-white">{player.name}</p>
                {player.username && (
                  <p className="text-xs text-zinc-500">@{player.username}</p>
                )}
                <p className="text-xs text-zinc-500 font-mono">{player.user_id}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-black text-orange-300">{player.cr}</p>
                <p className="text-xs text-zinc-400">{getRank(player.cr)}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Current CR</p>
              </div>
            </div>
          </div>
        )}

        {/* Update form — only shown when a player is loaded */}
        {player && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* New CR */}
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                  New CR <span className="text-zinc-600 font-normal">(0 – 9999)</span>
                </label>
                <input
                  type="number"
                  value={newCR}
                  onChange={(e) => setNewCR(e.target.value)}
                  placeholder={String(player.cr)}
                  min={0}
                  max={9999}
                  step={1}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Manual correction after match dispute"
                  maxLength={500}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
                />
              </div>
            </div>

            {/* Feedback */}
            {updateMsg && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  updateMsg.type === "success"
                    ? "border-green-700/40 bg-green-950/20 text-green-300"
                    : "border-red-700/40 bg-red-950/20 text-red-300"
                }`}
              >
                {updateMsg.text}
              </div>
            )}

            <button
              type="button"
              disabled={!canSubmit || updating}
              onClick={() => setShowConfirm(true)}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2.5 font-black text-white hover:from-orange-400 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? "Updating…" : "Update CR →"}
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Audit Logs                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-black">📋 Audit Logs</h2>

          {/* Filter + refresh */}
          <form onSubmit={handleLogsFilter} className="flex gap-2">
            <input
              type="text"
              value={logsFilter}
              onChange={(e) => setLogsFilter(e.target.value)}
              placeholder="Filter by Player ID…"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none w-52"
            />
            <button
              type="submit"
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setLogsFilter("");
                setLogsPage(0);
                loadLogs(0, "");
              }}
              disabled={loadingLogs}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              {loadingLogs ? "Loading…" : "↻ Refresh"}
            </button>
          </form>
        </div>

        {loadingLogs && logs.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 animate-pulse">Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">No audit logs found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-6 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-left">Player ID</th>
                    <th className="px-4 py-3 text-left">Old CR</th>
                    <th className="px-4 py-3 text-left">New CR</th>
                    <th className="px-4 py-3 text-left">Edited By</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-left">Edited At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const delta = log.new_cr - log.old_cr;
                    return (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-3 font-bold text-white">
                          {log.player_name ?? log.player_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                          {log.player_id}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{log.old_cr}</td>
                        <td className="px-4 py-3">
                          <span className="font-black text-white">{log.new_cr}</span>
                          <span
                            className={`ml-2 text-xs font-bold ${
                              delta > 0
                                ? "text-green-400"
                                : delta < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta < 0 ? String(delta) : "±0"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                          {log.edited_by}
                        </td>
                        <td className="px-4 py-3 text-zinc-300 max-w-xs truncate" title={log.reason}>
                          {log.reason}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                          {fmtTs(log.edited_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
                <p className="text-xs text-zinc-500">
                  Showing {logsPage * LOGS_PER_PAGE + 1}–
                  {Math.min((logsPage + 1) * LOGS_PER_PAGE, logsTotal)} of {logsTotal} entries
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLogsPage(logsPage - 1)}
                    disabled={logsPage === 0 || loadingLogs}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
                  >
                    ← Prev
                  </button>
                  <span className="flex items-center px-3 text-xs text-zinc-500">
                    Page {logsPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => handleLogsPage(logsPage + 1)}
                    disabled={logsPage >= totalPages - 1 || loadingLogs}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Confirmation dialog                                                 */}
      {/* ------------------------------------------------------------------ */}
      {showConfirm && player && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-orange-700/40 bg-[#0d0d14] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-orange-300 mb-4">⚠️ Confirm CR Update</h3>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-zinc-400">Player</span>
                <span className="font-bold text-white">{player.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Current CR</span>
                <span className="font-bold text-zinc-300">{player.cr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">New CR</span>
                <span className="font-black text-orange-300">{parsedNewCR}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Delta</span>
                <span
                  className={`font-black ${
                    parsedNewCR - player.cr > 0
                      ? "text-green-400"
                      : parsedNewCR - player.cr < 0
                      ? "text-red-400"
                      : "text-zinc-500"
                  }`}
                >
                  {parsedNewCR - player.cr > 0
                    ? `+${parsedNewCR - player.cr}`
                    : parsedNewCR - player.cr < 0
                    ? String(parsedNewCR - player.cr)
                    : "±0"}
                </span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-zinc-400 block mb-1">Reason</span>
                <span className="text-white text-xs">{reason}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mb-5">
              This action will be permanently recorded in the audit log.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-zinc-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-sm font-black text-white hover:from-orange-400 hover:to-red-400 transition"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
