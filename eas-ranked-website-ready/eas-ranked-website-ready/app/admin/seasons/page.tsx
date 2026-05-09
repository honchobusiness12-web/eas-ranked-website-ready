"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PlayerAvatar from "@/components/PlayerAvatar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeasonStatus = "active" | "paused" | "ended" | "upcoming";

interface Season {
  id: string;
  name: string;
  description: string;
  status: SeasonStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface TopPlayer {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  cr: number;
  matches: number;
  wins: number;
}

interface SeasonStats {
  total_matches: number;
  total_players: number;
  avg_cr: number;
  top_players: TopPlayer[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  // Convert to datetime-local format: YYYY-MM-DDTHH:mm
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_META: Record<
  SeasonStatus,
  { label: string; bg: string; border: string; text: string; badge: string }
> = {
  active: {
    label: "🟢 Active",
    bg: "bg-green-950/30",
    border: "border-green-700/50",
    text: "text-green-300",
    badge: "bg-gradient-to-r from-green-600 to-emerald-600",
  },
  paused: {
    label: "⏸ Paused",
    bg: "bg-yellow-950/30",
    border: "border-yellow-700/50",
    text: "text-yellow-300",
    badge: "bg-gradient-to-r from-yellow-600 to-amber-600",
  },
  ended: {
    label: "🔴 Ended",
    bg: "bg-red-950/30",
    border: "border-red-700/50",
    text: "text-red-300",
    badge: "bg-gradient-to-r from-red-700 to-rose-700",
  },
  upcoming: {
    label: "🔵 Upcoming",
    bg: "bg-blue-950/30",
    border: "border-blue-700/50",
    text: "text-blue-300",
    badge: "bg-gradient-to-r from-blue-600 to-indigo-600",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminSeasonsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Seasons list
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  // Current season stats
  const [currentStats, setCurrentStats] = useState<SeasonStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Selected season for stats view
  const [selectedStatsSeason, setSelectedStatsSeason] = useState<Season | null>(null);
  const [selectedStats, setSelectedStats] = useState<SeasonStats | null>(null);
  const [loadingSelectedStats, setLoadingSelectedStats] = useState(false);

  // Editor state
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<SeasonStatus>("upcoming");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // Submission state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<null | {
    label: string;
    description: string;
    onConfirm: () => void;
  }>(null);

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
        const res = await fetch("/api/admin/seasons");
        setIsOwner(res.ok);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // ---------------------------------------------------------------------------
  // Load seasons
  // ---------------------------------------------------------------------------

  const loadSeasons = useCallback(async () => {
    setLoadingSeasons(true);
    try {
      const res = await fetch("/api/admin/seasons");
      if (res.ok) {
        const data = await res.json();
        setSeasons(data.seasons ?? []);
      }
    } finally {
      setLoadingSeasons(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load current season stats
  // ---------------------------------------------------------------------------

  const loadCurrentStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/seasons/current");
      if (res.ok) {
        const data = await res.json();
        setCurrentStats(data.stats ?? null);
      }
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      loadSeasons();
      loadCurrentStats();
    }
  }, [isOwner, loadSeasons, loadCurrentStats]);

  // ---------------------------------------------------------------------------
  // Load stats for a specific season
  // ---------------------------------------------------------------------------

  async function loadSeasonStats(season: Season) {
    setSelectedStatsSeason(season);
    setSelectedStats(null);
    setLoadingSelectedStats(true);
    try {
      const res = await fetch(`/api/admin/seasons/${season.id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStats(data.stats ?? null);
      }
    } finally {
      setLoadingSelectedStats(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  function openCreate() {
    setIsCreating(true);
    setEditingSeason(null);
    setFormName("");
    setFormDescription("");
    setFormStatus("upcoming");
    setFormStartDate("");
    setFormEndDate("");
    setSaveMsg(null);
  }

  function openEdit(season: Season) {
    setIsCreating(false);
    setEditingSeason(season);
    setFormName(season.name);
    setFormDescription(season.description);
    setFormStatus(season.status);
    setFormStartDate(fmtDateInput(season.start_date));
    setFormEndDate(fmtDateInput(season.end_date));
    setSaveMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setIsCreating(false);
    setEditingSeason(null);
    setSaveMsg(null);
  }

  // ---------------------------------------------------------------------------
  // Save (create or update)
  // ---------------------------------------------------------------------------

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const doSave = async () => {
      setSaving(true);
      setSaveMsg(null);

      try {
        const body = {
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
          start_date: formStartDate ? new Date(formStartDate).toISOString() : null,
          end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
        };

        const url = editingSeason
          ? `/api/admin/seasons/${editingSeason.id}`
          : "/api/admin/seasons";
        const method = editingSeason ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setSaveMsg({
            type: "success",
            text: editingSeason ? "✅ Season updated successfully!" : "✅ Season created successfully!",
          });
          cancelEdit();
          loadSeasons();
          loadCurrentStats();
        } else {
          setSaveMsg({ type: "error", text: data.error ?? "Failed to save season." });
        }
      } catch {
        setSaveMsg({ type: "error", text: "An unexpected error occurred." });
      } finally {
        setSaving(false);
      }
    };

    // Warn if setting to active (will pause other active seasons)
    if (formStatus === "active") {
      const hasOtherActive = seasons.some(
        (s) => s.status === "active" && s.id !== editingSeason?.id
      );
      if (hasOtherActive) {
        setConfirmAction({
          label: "Set Season Active",
          description:
            "Setting this season to Active will automatically pause any currently active season. Continue?",
          onConfirm: doSave,
        });
        return;
      }
    }

    await doSave();
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  function handleDelete(season: Season) {
    if (season.status === "active") {
      setSaveMsg({ type: "error", text: "❌ Cannot delete an active season. End or pause it first." });
      return;
    }

    setConfirmAction({
      label: "Delete Season",
      description: `Permanently delete "${season.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setDeleting(season.id);
        try {
          const res = await fetch(`/api/admin/seasons/${season.id}`, { method: "DELETE" });
          if (res.ok) {
            loadSeasons();
            if (selectedStatsSeason?.id === season.id) {
              setSelectedStatsSeason(null);
              setSelectedStats(null);
            }
          } else {
            const data = await res.json();
            setSaveMsg({ type: "error", text: data.error ?? "Failed to delete season." });
          }
        } finally {
          setDeleting(null);
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Quick status change
  // ---------------------------------------------------------------------------

  function handleQuickStatus(season: Season, newStatus: SeasonStatus) {
    const meta = STATUS_META[newStatus];
    setConfirmAction({
      label: `Set to ${meta.label}`,
      description:
        newStatus === "active"
          ? `Set "${season.name}" to Active? Any currently active season will be paused.`
          : `Set "${season.name}" to ${meta.label}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/seasons/${season.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          if (res.ok) {
            loadSeasons();
            loadCurrentStats();
          } else {
            const data = await res.json();
            setSaveMsg({ type: "error", text: data.error ?? "Failed to update status." });
          }
        } catch {
          setSaveMsg({ type: "error", text: "An unexpected error occurred." });
        }
      },
    });
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

  const activeSeason = seasons.find((s) => s.status === "active") ?? null;

  // ---------------------------------------------------------------------------
  // Render: main page
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d14] p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white">{confirmAction.label}</h3>
            <p className="mt-2 text-sm text-zinc-400">{confirmAction.description}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  confirmAction.onConfirm();
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-2.5 font-black text-white hover:from-orange-400 hover:to-red-400 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 font-bold text-zinc-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-black">🏆 Season Management</h1>
        <p className="mt-2 text-zinc-400">
          Manage ranked seasons — create, edit, archive, and track statistics. Owner access only.
        </p>
      </div>

      {/* Global feedback */}
      {saveMsg && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm font-bold ${
            saveMsg.type === "success"
              ? "border-green-700/40 bg-green-950/20 text-green-300"
              : "border-red-700/40 bg-red-950/20 text-red-300"
          }`}
        >
          {saveMsg.text}
          <button
            onClick={() => setSaveMsg(null)}
            className="ml-3 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Current Season Overview                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active season card */}
        <div className="rounded-2xl border border-orange-700/30 bg-gradient-to-br from-orange-950/20 to-black p-6">
          <h2 className="mb-4 text-xl font-black text-orange-300">📡 Current Active Season</h2>
          {activeSeason ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-white">{activeSeason.name}</p>
                  {activeSeason.description && (
                    <p className="mt-1 text-sm text-zinc-400">{activeSeason.description}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-lg px-3 py-1 text-xs font-black text-white ${STATUS_META.active.badge}`}
                >
                  ACTIVE
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-xs text-zinc-500">Start Date</p>
                  <p className="font-bold text-white">{fmt(activeSeason.start_date)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-xs text-zinc-500">End Date</p>
                  <p className="font-bold text-white">{fmt(activeSeason.end_date)}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEdit(activeSeason)}
                  className="rounded-xl border border-blue-700/40 bg-blue-950/20 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-950/40 transition"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleQuickStatus(activeSeason, "paused")}
                  className="rounded-xl border border-yellow-700/40 bg-yellow-950/20 px-3 py-1.5 text-xs font-bold text-yellow-300 hover:bg-yellow-950/40 transition"
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={() => handleQuickStatus(activeSeason, "ended")}
                  className="rounded-xl border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-950/40 transition"
                >
                  🔴 End Season
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-zinc-400">No active season.</p>
              <button
                onClick={openCreate}
                className="mt-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-black text-white hover:from-orange-400 hover:to-red-400 transition-all"
              >
                + Create Season
              </button>
            </div>
          )}
        </div>

        {/* Season stats */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">📊 Season Statistics</h2>
            <button
              onClick={loadCurrentStats}
              disabled={loadingStats}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              {loadingStats ? "Loading…" : "↻ Refresh"}
            </button>
          </div>
          {loadingStats ? (
            <div className="animate-pulse text-center text-zinc-500 py-8">Loading stats…</div>
          ) : currentStats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Players" value={currentStats.total_players.toLocaleString()} color="teal" />
                <StatCard label="Total Matches" value={currentStats.total_matches.toLocaleString()} color="orange" />
                <StatCard label="Avg CR" value={currentStats.avg_cr.toLocaleString()} color="yellow" />
              </div>
              {currentStats.top_players.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                    Top Players
                  </p>
                  <div className="space-y-2">
                    {currentStats.top_players.slice(0, 5).map((p, i) => (
                      <div
                        key={p.user_id}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                      >
                        <span className="w-5 text-center text-sm font-black text-zinc-500">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-7 w-7" />
                        <span className="flex-1 truncate text-sm font-bold text-white">{p.name}</span>
                        <span className="text-sm font-black text-orange-400">{p.cr} CR</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500">
              {activeSeason ? "No stats available." : "No active season to show stats for."}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Season Editor                                            */}
      {/* ------------------------------------------------------------------ */}
      {(isCreating || editingSeason) && (
        <div className="mb-8 rounded-2xl border border-orange-700/30 bg-gradient-to-br from-orange-950/20 to-black p-6">
          <h2 className="mb-5 text-xl font-black text-orange-300">
            {isCreating ? "✨ Create New Season" : `✏️ Edit: ${editingSeason?.name}`}
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Season Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Summer Season 2026"
                maxLength={255}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of this season…"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                  Status
                </label>
                <div className="flex flex-col gap-2">
                  {(["active", "paused", "ended", "upcoming"] as SeasonStatus[]).map((s) => {
                    const meta = STATUS_META[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormStatus(s)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold text-left transition ${
                          formStatus === s
                            ? `${meta.bg} ${meta.border} ${meta.text}`
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-orange-600/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-orange-600/60 focus:outline-none"
                  />
                </div>
                {formStartDate && formEndDate && (
                  <SeasonProgress startDate={formStartDate} endDate={formEndDate} />
                )}
              </div>
            </div>

            {/* Feedback */}
            {saveMsg && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  saveMsg.type === "success"
                    ? "border-green-700/40 bg-green-950/20 text-green-300"
                    : "border-red-700/40 bg-red-950/20 text-red-300"
                }`}
              >
                {saveMsg.text}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !formName.trim()}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2.5 font-black text-white hover:from-orange-400 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : isCreating ? "✨ Create Season" : "💾 Save Changes"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-zinc-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create button (when not editing) */}
      {!isCreating && !editingSeason && (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">📋 Season History</h2>
          <button
            onClick={openCreate}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 font-black text-white hover:from-orange-400 hover:to-red-400 transition-all"
          >
            + New Season
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Season History                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-black">
            {isCreating || editingSeason ? "📋 Season History" : ""}
          </h2>
          <button
            onClick={loadSeasons}
            disabled={loadingSeasons}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {loadingSeasons ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {loadingSeasons && seasons.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 animate-pulse">Loading seasons…</div>
        ) : seasons.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">
            No seasons yet.{" "}
            <button onClick={openCreate} className="text-orange-400 hover:underline">
              Create the first one →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {seasons.map((season) => {
              const meta = STATUS_META[season.status];
              return (
                <div key={season.id} className="px-6 py-5 hover:bg-white/5 transition">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`rounded-lg border px-2 py-0.5 text-xs font-black ${meta.bg} ${meta.border} ${meta.text}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Created {fmt(season.created_at)}
                        </span>
                      </div>
                      <p className="text-lg font-black text-white truncate">{season.name}</p>
                      {season.description && (
                        <p className="mt-0.5 text-sm text-zinc-400 line-clamp-2">
                          {season.description}
                        </p>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                        <span>📅 Start: {fmt(season.start_date)}</span>
                        <span>🏁 End: {fmt(season.end_date)}</span>
                      </div>
                      {season.start_date && season.end_date && (
                        <div className="mt-2 max-w-xs">
                          <SeasonProgress
                            startDate={season.start_date}
                            endDate={season.end_date}
                            compact
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Quick status buttons */}
                      {season.status !== "active" && (
                        <button
                          onClick={() => handleQuickStatus(season, "active")}
                          className="rounded-lg border border-green-700/40 bg-green-950/20 px-2.5 py-1 text-xs font-bold text-green-300 hover:bg-green-950/40 transition"
                        >
                          ▶ Activate
                        </button>
                      )}
                      {season.status === "active" && (
                        <button
                          onClick={() => handleQuickStatus(season, "paused")}
                          className="rounded-lg border border-yellow-700/40 bg-yellow-950/20 px-2.5 py-1 text-xs font-bold text-yellow-300 hover:bg-yellow-950/40 transition"
                        >
                          ⏸ Pause
                        </button>
                      )}
                      {season.status !== "ended" && (
                        <button
                          onClick={() => handleQuickStatus(season, "ended")}
                          className="rounded-lg border border-red-700/40 bg-red-950/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-950/40 transition"
                        >
                          🔴 End
                        </button>
                      )}
                      <button
                        onClick={() => loadSeasonStats(season)}
                        className="rounded-lg border border-teal-700/40 bg-teal-950/20 px-2.5 py-1 text-xs font-bold text-teal-300 hover:bg-teal-950/40 transition"
                      >
                        📊 Stats
                      </button>
                      <button
                        onClick={() => openEdit(season)}
                        className="rounded-lg border border-blue-700/40 bg-blue-950/20 px-2.5 py-1 text-xs font-bold text-blue-300 hover:bg-blue-950/40 transition"
                      >
                        ✏️ Edit
                      </button>
                      {season.status !== "active" && (
                        <button
                          onClick={() => handleDelete(season)}
                          disabled={deleting === season.id}
                          className="rounded-lg border border-red-700/40 bg-red-950/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                        >
                          {deleting === season.id ? "…" : "🗑️ Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4: Selected Season Stats                                    */}
      {/* ------------------------------------------------------------------ */}
      {selectedStatsSeason && (
        <div className="mt-8 rounded-2xl border border-teal-700/30 bg-gradient-to-br from-teal-950/20 to-black p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-teal-300">
                📊 Stats: {selectedStatsSeason.name}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {fmt(selectedStatsSeason.start_date)} → {fmt(selectedStatsSeason.end_date)}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedStatsSeason(null);
                setSelectedStats(null);
              }}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
            >
              ✕ Close
            </button>
          </div>

          {loadingSelectedStats ? (
            <div className="animate-pulse text-center text-zinc-500 py-8">Loading stats…</div>
          ) : selectedStats ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total Players" value={selectedStats.total_players.toLocaleString()} color="teal" />
                <StatCard label="Total Matches" value={selectedStats.total_matches.toLocaleString()} color="orange" />
                <StatCard label="Average CR" value={selectedStats.avg_cr.toLocaleString()} color="yellow" />
              </div>

              {/* Top 10 players */}
              {selectedStats.top_players.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-zinc-400">
                    🏆 Top 10 Players
                  </h3>
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider text-zinc-500">
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Player</th>
                          <th className="px-4 py-3 text-right">CR</th>
                          <th className="px-4 py-3 text-right">Matches</th>
                          <th className="px-4 py-3 text-right">Wins</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStats.top_players.map((p, i) => (
                          <tr
                            key={p.user_id}
                            className="border-b border-white/5 hover:bg-white/5 transition"
                          >
                            <td className="px-4 py-3 font-black text-zinc-400">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                                <div>
                                  <p className="font-bold text-white">{p.name}</p>
                                  {p.username && (
                                    <p className="text-xs text-zinc-500">@{p.username}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-orange-400">
                              {p.cr}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-300">{p.matches}</td>
                            <td className="px-4 py-3 text-right text-green-400">{p.wins}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500">No stats available.</div>
          )}
        </div>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "teal" | "orange" | "yellow";
}) {
  const styles = {
    teal: { border: "border-cyan-700/30", note: "text-cyan-400", glow: "bg-cyan-500/5" },
    orange: { border: "border-orange-700/30", note: "text-orange-400", glow: "bg-orange-500/5" },
    yellow: { border: "border-yellow-700/30", note: "text-yellow-400", glow: "bg-yellow-500/5" },
  };
  const s = styles[color];
  return (
    <div className={`rounded-xl border ${s.border} ${s.glow} bg-[#0d0d14] p-4`}>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${s.note}`}>{value}</p>
    </div>
  );
}

function SeasonProgress({
  startDate,
  endDate,
  compact = false,
}: {
  startDate: string;
  endDate: string;
  compact?: boolean;
}) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();

  if (isNaN(start) || isNaN(end) || end <= start) return null;

  const total = end - start;
  const elapsed = Math.max(0, Math.min(now - start, total));
  const pct = Math.round((elapsed / total) * 100);
  const daysTotal = Math.round(total / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)));

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
        <span>{pct}% complete</span>
        {!compact && <span>{daysLeft} days remaining</span>}
        {compact && <span>{daysLeft}d left</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <p className="mt-1 text-xs text-zinc-600">{daysTotal} day season total</p>
      )}
    </div>
  );
}
