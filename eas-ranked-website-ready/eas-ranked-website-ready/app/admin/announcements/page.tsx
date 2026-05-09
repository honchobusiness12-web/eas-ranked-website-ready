"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

const DEVELOPER_ID = "733871667788644445";

interface Announcement {
  id: string;
  title: string;
  message: string;
  color: string;
  sound_enabled: boolean;
  ping_role_id: string | null;
  created_by: string;
  created_at: string;
}

const COLOR_PRESETS = [
  { hex: "#FF9F43", label: "Orange" },
  { hex: "#FF6B6B", label: "Coral" },
  { hex: "#00D4FF", label: "Teal" },
  { hex: "#00FF88", label: "Lime" },
  { hex: "#A855F7", label: "Purple" },
  { hex: "#FFD700", label: "Gold" },
  { hex: "#EF4444", label: "Red" },
  { hex: "#FFFFFF", label: "White" },
];

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnnouncementsAdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("#FF9F43");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pingRoleId, setPingRoleId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Announcements list
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setIsDeveloper(data.user?.id === DEVELOPER_ID);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/announcements/list");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements ?? []);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isDeveloper) loadAnnouncements();
  }, [isDeveloper, loadAnnouncements]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);

    try {
      const res = await fetch("/api/announcements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          color,
          sound_enabled: soundEnabled,
          ping_role_id: pingRoleId.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreateMsg({ type: "success", text: `Announcement "${data.announcement.title}" created!` });
        setTitle("");
        setMessage("");
        setColor("#FF9F43");
        setSoundEnabled(true);
        setPingRoleId("");
        loadAnnouncements();
      } else {
        setCreateMsg({ type: "error", text: data.error ?? "Failed to create announcement." });
      }
    } catch {
      setCreateMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, announcementTitle: string) {
    if (!confirm(`Delete announcement "${announcementTitle}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/announcements/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        loadAnnouncements();
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Checking access…</p>
        </div>
      </Shell>
    );
  }

  if (!isDeveloper) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🚫</p>
            <h1 className="text-2xl font-black text-red-400">Access Denied</h1>
            <p className="mt-2 text-zinc-400">This panel is restricted to the EAS Arena developer.</p>
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

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-4xl font-black">📢 Announcement Panel</h1>
        <p className="mt-2 text-zinc-400">
          Create live announcements that appear on the home page for all users. Developer access only.
        </p>
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-6 mb-8">
        <h2 className="mb-5 text-xl font-black text-yellow-300">✨ New Announcement</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Season 2 is live!"
                maxLength={255}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-yellow-600/60 focus:outline-none"
              />
            </div>

            {/* Message */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement here…"
                rows={4}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-yellow-600/60 focus:outline-none resize-none"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Card Color
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColor(preset.hex)}
                    title={preset.label}
                    className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${
                      color === preset.hex ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#FF9F43"
                  maxLength={7}
                  className="w-32 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white focus:border-yellow-600/60 focus:outline-none"
                />
                <div
                  className="h-8 w-8 rounded-lg border border-white/20"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>

            {/* Ping role ID */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Ping Role ID <span className="text-zinc-600 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={pingRoleId}
                onChange={(e) => setPingRoleId(e.target.value)}
                placeholder="Discord role ID"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-yellow-600/60 focus:outline-none"
              />
            </div>

            {/* Sound toggle */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setSoundEnabled((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    soundEnabled ? "bg-yellow-500" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      soundEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <span className="text-sm font-bold text-zinc-300">
                  {soundEnabled ? "🔔 Sound notification enabled" : "🔕 Sound notification disabled"}
                </span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">Preview</p>
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: `${color}40`,
                background: `linear-gradient(135deg, ${color}15, #0d0d14)`,
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">📢</span>
                <div className="flex-1">
                  <p className="font-black" style={{ color }}>
                    {title || "Announcement Title"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {message || "Your announcement message will appear here."}
                  </p>
                </div>
                {soundEnabled && <span className="text-sm">🔔</span>}
              </div>
            </div>
          </div>

          {/* Feedback */}
          {createMsg && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                createMsg.type === "success"
                  ? "border-green-700/40 bg-green-950/20 text-green-300"
                  : "border-red-700/40 bg-red-950/20 text-red-300"
              }`}
            >
              {createMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={creating || !title.trim() || !message.trim()}
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-2.5 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Sending…" : "📢 Send Announcement →"}
          </button>
        </form>
      </div>

      {/* Announcements list */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-black">📋 Recent Announcements</h2>
          <button
            onClick={loadAnnouncements}
            disabled={loadingList}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {loadingList ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {loadingList && announcements.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 animate-pulse">Loading announcements…</div>
        ) : announcements.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">No announcements yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-5 hover:bg-white/5 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="mt-0.5 h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ann.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-black" style={{ color: ann.color }}>
                          {ann.title}
                        </p>
                        {ann.sound_enabled && (
                          <span className="text-xs text-zinc-500">🔔</span>
                        )}
                        {ann.ping_role_id && (
                          <span className="rounded-md bg-blue-950/30 border border-blue-700/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                            @role
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2">{ann.message}</p>
                      <p className="mt-1.5 text-xs text-zinc-600">
                        {fmt(ann.created_at)} · by {ann.created_by}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(ann.id, ann.title)}
                    disabled={deletingId === ann.id}
                    className="flex-shrink-0 rounded-lg border border-red-700/40 bg-red-950/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                  >
                    {deletingId === ann.id ? "…" : "🗑️ Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
