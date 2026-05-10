"use client";

import { useState, useTransition } from "react";
import { getAuditLogs } from "@/lib/admin-actions";
import type { AuditLogEntry } from "@/lib/admin-actions";

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  assign_badge:       { label: "Assign Badge",       icon: "🏅", color: "text-green-400" },
  remove_badge:       { label: "Remove Badge",       icon: "🗑️", color: "text-red-400" },
  grant_premium:      { label: "Grant Premium",      icon: "💎", color: "text-yellow-400" },
  revoke_premium:     { label: "Revoke Premium",     icon: "🚫", color: "text-orange-400" },
  edit_stat:          { label: "Edit Stat",          icon: "✏️", color: "text-blue-400" },
  edit_stats_bulk:    { label: "Edit Stats (Bulk)",  icon: "📝", color: "text-blue-400" },
  reset_player_stats: { label: "Reset Player",       icon: "🔄", color: "text-orange-400" },
  reset_all_players:  { label: "Reset All Players",  icon: "☢️", color: "text-red-400" },
};

function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === "assign_badge" || action === "remove_badge") {
    return `badge: ${details.badge}`;
  }
  if (action === "edit_stat") {
    return `${details.stat}: ${details.old_value} → ${details.new_value}`;
  }
  if (action === "edit_stats_bulk") {
    const stats = details.stats as Record<string, number> | undefined;
    if (stats) {
      return Object.entries(stats)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
    }
  }
  if (action === "reset_all_players") {
    return `${details.players_affected} players affected`;
  }
  if (action === "grant_premium") {
    return details.expiresAt ? `expires: ${new Date(details.expiresAt as string).toLocaleDateString()}` : "";
  }
  return "";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  initialLogs?: AuditLogEntry[];
}

export default function AuditLog({ initialLogs = [] }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(initialLogs.length > 0);

  function handleLoad() {
    startTransition(async () => {
      const res = await getAuditLogs(50);
      if (res.success && res.data) {
        setLogs(res.data);
        setLoaded(true);
      }
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      const res = await getAuditLogs(50);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
          📋 Audit Log
        </p>
        <div className="flex gap-2">
          {loaded && (
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              {isPending ? "…" : "↻ Refresh"}
            </button>
          )}
          {!loaded && (
            <button
              onClick={handleLoad}
              disabled={isPending}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              {isPending ? "Loading…" : "Load Logs"}
            </button>
          )}
        </div>
      </div>

      {!loaded && !isPending && (
        <p className="text-xs text-zinc-600 text-center py-4">
          Click "Load Logs" to view recent admin actions.
        </p>
      )}

      {isPending && (
        <p className="text-xs text-zinc-500 animate-pulse text-center py-4">
          Loading audit logs…
        </p>
      )}

      {loaded && logs.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">
          No audit log entries yet.
        </p>
      )}

      {loaded && logs.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {logs.map((entry) => {
            const meta = ACTION_LABELS[entry.action] ?? {
              label: entry.action,
              icon: "⚙️",
              color: "text-zinc-400",
            };
            const detail = formatDetails(entry.action, entry.details);
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-black ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 shrink-0">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
                {entry.target_name && (
                  <p className="text-xs text-zinc-400">
                    Target:{" "}
                    <span className="text-white font-bold">{entry.target_name}</span>
                    <span className="text-zinc-600 font-mono ml-1 text-[10px]">
                      ({entry.target_user_id})
                    </span>
                  </p>
                )}
                {detail && (
                  <p className="text-[10px] text-zinc-500 font-mono">{detail}</p>
                )}
                <p className="text-[10px] text-zinc-600">
                  by {entry.admin_name ?? entry.admin_id}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
