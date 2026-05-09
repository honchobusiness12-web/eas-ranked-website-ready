"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import { ANNOUNCEMENT_COLORS } from "@/lib/announcement-constants";

interface Announcement {
  id: string;
  title: string;
  message: string;
  color: string;
  sound_enabled: boolean;
  created_by: string;
  created_at: string;
  dismissed_by: string[];
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAnnouncementsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("blue");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Announcements list
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Deleting state
  const [deleting, setDeleting] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements ?? []);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) loadAnnouncements();
  }, [isOwner, loadAnnouncements]);

  function resetForm() {
    setTitle("");
    setMessage("");
    setColor("blue");
    setSoundEnabled(false);
    setEditingId(null);
    setPublishMsg(null);
  }

  function startEdit(ann: Announcement) {
    setEditingId(ann.id);
    setTitle(ann.title);
    setMessage(ann.message);
    setColor(ann.color);
    setSoundEnabled(ann.sound_enabled);
    setPublishMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    setPublishMsg(null);

    try {
      const isEdit = !!editingId;
      const res = await fetch("/api/admin/announcements", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingId } : {}),
          title: title.trim(),
          message: message.trim(),
          color,
          sound_enabled: soundEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPublishMsg({
          type: "success",
          text: isEdit ? "✅ Announcement updated!" : "✅ Announcement published!",
        });
        resetForm();
        loadAnnouncements();
      } else {
        setPublishMsg({ type: "error", text: data.error ?? "Failed to publish." });
      }
    } catch {
      setPublishMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (res.ok) loadAnnouncements();
    } finally {
      setDeleting(null);
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

  const activeColorMeta = ANNOUNCEMENT_COLORS.find((c) => c.id === color);

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-4xl font-black">📢 Announcement Panel</h1>
        <p className="mt-2 text-zinc-400">
          Publish live announcements to the dashboard. Developer access only.
        </p>
      </div>

      {/* Publish / Edit form */}
      <div className="rounded-2xl border border-orange-700/30 bg-gradient-to-br from-orange-950/20 to-black p-6 mb-8">
        <h2 className="mb-5 text-xl font-black text-orange-300">
          {editingId ? "✏️ Edit Announcement" : "✨ New Announcement"}
        </h2>

        <form onSubmit={handlePublish} className="space-y-4">
          {/* Title */}
          <div>
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
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
              Message <span className="text-zinc-600 font-normal">(markdown supported)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement here…"
              rows={4}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Color */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Color / Type
              </label>
              <div className="flex flex-wrap gap-2">
                {ANNOUNCEMENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      color === c.id
                        ? `${c.bg} ${c.border} ${c.text}`
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Sound Ping
              </label>
              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                  soundEnabled
                    ? "border-yellow-600/50 bg-yellow-950/20 text-yellow-300"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                }`}
              >
                <span>{soundEnabled ? "🔔" : "🔕"}</span>
                <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
              </button>
              <p className="mt-1 text-xs text-zinc-600">
                Plays a ping sound when the announcement appears.
              </p>
            </div>
          </div>

          {/* Preview */}
          {title && (
            <div
              className={`rounded-xl border p-4 ${activeColorMeta?.bg ?? "bg-blue-950/30"} ${activeColorMeta?.border ?? "border-blue-700/50"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-black uppercase tracking-wider ${activeColorMeta?.text ?? "text-blue-300"}`}>
                      📢 From Developer
                    </span>
                    {soundEnabled && <span className="text-xs">🔔</span>}
                  </div>
                  <p className="font-black text-white">{title}</p>
                  {message && <p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">{message}</p>}
                </div>
                <span className="text-xs text-zinc-500 shrink-0">Just now</span>
              </div>
            </div>
          )}

          {/* Feedback */}
          {publishMsg && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                publishMsg.type === "success"
                  ? "border-green-700/40 bg-green-950/20 text-green-300"
                  : "border-red-700/40 bg-red-950/20 text-red-300"
              }`}
            >
              {publishMsg.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={publishing || !title.trim() || !message.trim()}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2.5 font-black text-white hover:from-orange-400 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? "Publishing…" : editingId ? "✏️ Update" : "📢 Publish"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-zinc-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Announcements history */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-black">📋 Announcement History</h2>
          <button
            onClick={loadAnnouncements}
            disabled={loadingList}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {loadingList ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {loadingList && announcements.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 animate-pulse">Loading…</div>
        ) : announcements.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">No announcements yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {announcements.map((ann) => {
              const meta = ANNOUNCEMENT_COLORS.find((c) => c.id === ann.color);
              return (
                <div key={ann.id} className="px-6 py-4 hover:bg-white/5 transition">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`rounded-lg border px-2 py-0.5 text-xs font-black ${meta?.bg ?? ""} ${meta?.border ?? ""} ${meta?.text ?? ""}`}
                        >
                          {meta?.label ?? ann.color}
                        </span>
                        {ann.sound_enabled && (
                          <span className="text-xs text-yellow-400">🔔 Sound</span>
                        )}
                        <span className="text-xs text-zinc-500">{fmt(ann.created_at)}</span>
                      </div>
                      <p className="font-black text-white truncate">{ann.title}</p>
                      <p className="mt-0.5 text-sm text-zinc-400 line-clamp-2">{ann.message}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {ann.dismissed_by?.length ?? 0} user(s) dismissed
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(ann)}
                        className="rounded-lg border border-blue-700/40 bg-blue-950/20 px-2.5 py-1 text-xs font-bold text-blue-300 hover:bg-blue-950/40 transition"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        disabled={deleting === ann.id}
                        className="rounded-lg border border-red-700/40 bg-red-950/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                      >
                        {deleting === ann.id ? "…" : "🗑️ Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
