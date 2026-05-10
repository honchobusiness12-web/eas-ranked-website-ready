"use client";

/**
 * app/admin/components/AuditLog.tsx
 *
 * Displays recent admin audit log entries.
 * Fetches from the /api/admin/audit endpoint.
 * Optionally filtered to a specific player.
 */

import { useState, useEffect, useCallback } from "react";
import { type AuditLogEntry } from "@/lib/admin/actions";

interface Props {
  /** If provided, only show entries for this player */
  targetUserId?: string;
  /** Number of entries per page */
  pageSize?: number;
}

const ACTION_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  assign_badge:       { icon: "🏅", label: "Badge Assigned",    color: "text-cyan-400" },
  remove_badge:       { icon: "🗑️", label: "Badge Removed",     color: "text-orange-400" },
  grant_premium:      { icon: "⭐", label: "Premium Granted",   color: "text-yellow-400" },
  revoke_premium:     { icon: "❌", label: "Premium Revoked",   color: "text-red-400" },
  edit_stats:         { icon: "📊", label: "Stats Edited",      color: "text-blue-400" },
  reset_player_stats: { icon: "🔄", label: "Player Reset",      color: "text-orange-400" },
  reset_all_stats:    { icon: "💣", label: "All Stats Reset",   color: "text-red-500" },
};

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailBadge({ details }: { details: Record<string, unknown> }) {
  const parts: string[] = [];

  if (details.badgeId) parts.push(`badge: ${details.badgeId}`);
  if (details.stats) {
    const stats = details.stats as Record<string, number>;
    parts.push(
      Object.entries(stats)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    );
  }
  if (details.affected !== undefined) parts.push(`${details.affected} players`);
  if (details.expiresAt) parts.push(`expires: ${details.expiresAt}`);

  if (parts.length === 0) return null;

  return (
    <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[200px]">
      {parts.join(" · ")}
    </span>
  );
}

export default function AuditLog({ targetUserId, pageSize = 10 }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (pageIndex: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(pageSize),
          offset: String(pageIndex * pageSize),
        });
        if (targetUserId) params.set("userId", targetUserId);

        const res = await fetch(`/api/admin/audit?${params}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to load audit log.");
          return;
        }
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setError("Failed to load audit log.");
      } finally {
        setLoading(false);
      }
    },
    [targetUserId, pageSize]
  );

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        border: "2px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/8 bg-white/[0.02] flex items-center justify-between">
        <div>
          <p className="font-black text-sm text-zinc-300">📋 Audit Log</p>
          <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
            {total > 0 ? `${total} action${total !== 1 ? "s" : ""} recorded` : "No actions yet"}
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="text-xs font-black text-zinc-500 hover:text-zinc-300 transition disabled:opacity-40"
          title="Refresh"
        >
          {loading ? <span className="animate-spin inline-block">⟳</span> : "↻ Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-4 text-center">
          <p className="text-sm font-black text-red-400">{error}</p>
          <button
            onClick={() => fetchLogs(page)}
            className="mt-2 text-xs font-black text-red-300 hover:text-red-200 transition"
          >
            ↻ Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-zinc-800 rounded-full w-32" />
                <div className="h-2.5 bg-zinc-800/60 rounded-full w-48" />
              </div>
              <div className="h-2.5 bg-zinc-800/60 rounded-full w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && logs.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm font-bold text-zinc-500">No audit entries yet</p>
        </div>
      )}

      {/* Log entries */}
      {!loading && !error && logs.length > 0 && (
        <div className="divide-y divide-white/5">
          {logs.map((entry) => {
            const meta = ACTION_LABELS[entry.action] ?? {
              icon: "⚙️",
              label: entry.action,
              color: "text-zinc-400",
            };

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base bg-white/5 border border-white/8">
                  {meta.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black ${meta.color}`}>
                      {meta.label}
                    </span>
                    {entry.player_name && (
                      <span className="text-xs font-bold text-zinc-400 truncate">
                        → {entry.player_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-zinc-600">
                      by {entry.admin_id}
                    </span>
                    <DetailBadge details={entry.details} />
                  </div>
                </div>

                {/* Timestamp */}
                <span className="flex-shrink-0 text-[10px] font-bold text-zinc-600">
                  {fmtDate(entry.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > pageSize && (
        <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
          <p className="text-[11px] font-bold text-zinc-600">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
