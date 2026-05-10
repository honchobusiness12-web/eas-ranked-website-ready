"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuditLogs } from "../_actions";
import type { AuditLogEntry } from "../_actions";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  assign_badge:       { label: "Assign Badge",    color: "text-cyan-400" },
  remove_badge:       { label: "Remove Badge",    color: "text-orange-400" },
  grant_premium:      { label: "Grant Premium",   color: "text-yellow-400" },
  revoke_premium:     { label: "Revoke Premium",  color: "text-red-400" },
  update_stats:       { label: "Update Stats",    color: "text-blue-400" },
  reset_player_stats: { label: "Reset Player",    color: "text-orange-400" },
  reset_all_stats:    { label: "Reset All",       color: "text-red-500" },
};

function fmtTs(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  userId?: string;
  compact?: boolean;
}

const PAGE_SIZE = 15;

export function AuditLog({ userId, compact = false }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(
    async (p: number, action: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAuditLogs({
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
          userId,
          action: action || undefined,
        });
        if (result.success && result.data) {
          setLogs(result.data.logs);
          setTotal(result.data.total);
        } else {
          setError(result.error ?? "Failed to load audit logs.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    load(0, "");
  }, [load]);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    load(0, actionFilter);
  }

  function handlePage(newPage: number) {
    setPage(newPage);
    load(newPage, actionFilter);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Controls */}
      {!compact && (
        <form onSubmit={handleFilter} className="flex gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-red-600/50 focus:outline-none"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setActionFilter("");
              setPage(0);
              load(0, "");
            }}
            disabled={isLoading}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "↻ Refresh"}
          </button>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading && logs.length === 0 ? (
        <div className="py-10 text-center text-zinc-500 animate-pulse">
          Loading audit logs…
        </div>
      ) : logs.length === 0 ? (
        <div className="py-10 text-center text-zinc-500">
          No audit log entries found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 text-left">Action</th>
                {!userId && (
                  <th className="px-4 py-3 text-left">Player</th>
                )}
                <th className="px-4 py-3 text-left">Admin</th>
                <th className="px-4 py-3 text-left">Changes</th>
                <th className="px-4 py-3 text-left">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => {
                const actionMeta =
                  ACTION_LABELS[log.action] ?? {
                    label: log.action,
                    color: "text-zinc-400",
                  };
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-white/[0.03] transition"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-black ${actionMeta.color}`}
                      >
                        {actionMeta.label}
                      </span>
                    </td>
                    {!userId && (
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-white">
                          {log.player_name ?? log.user_id}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-600">
                          {log.user_id}
                        </p>
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">
                      {log.admin_id}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <ChangeSummary action={log.action} changes={log.changes} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500 whitespace-nowrap">
                      {fmtTs(log.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
            {total.toLocaleString()} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page === 0 || isLoading}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page >= totalPages - 1 || isLoading}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeSummary({
  action,
  changes,
}: {
  action: string;
  changes: Record<string, unknown>;
}) {
  if (action === "assign_badge" || action === "remove_badge") {
    return (
      <span className="text-xs text-zinc-400">
        Badge:{" "}
        <span className="font-bold text-white">
          {String(changes.badge ?? "—")}
        </span>
      </span>
    );
  }
  if (action === "grant_premium" || action === "revoke_premium") {
    const after = (changes.after as Record<string, unknown>) ?? {};
    return (
      <span className="text-xs text-zinc-400">
        Expires:{" "}
        <span className="font-bold text-white">
          {after.premium_expires_at
            ? new Date(String(after.premium_expires_at)).toLocaleDateString()
            : "—"}
        </span>
      </span>
    );
  }
  if (action === "update_stats") {
    const changed = (changes.changed as string[]) ?? [];
    return (
      <span className="text-xs text-zinc-400">
        Fields: <span className="font-bold text-white">{changed.join(", ")}</span>
      </span>
    );
  }
  if (action === "reset_player_stats") {
    return (
      <span className="text-xs text-zinc-400">All stats → 0</span>
    );
  }
  if (action === "reset_all_stats") {
    return (
      <span className="text-xs text-red-400 font-bold">
        {String(changes.players_affected ?? "?")} players reset
      </span>
    );
  }
  return (
    <span className="text-xs text-zinc-600 font-mono truncate block max-w-[200px]">
      {JSON.stringify(changes).slice(0, 60)}…
    </span>
  );
}
