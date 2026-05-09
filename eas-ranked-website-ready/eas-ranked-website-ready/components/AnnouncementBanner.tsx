"use client";

import { useState, useEffect, useRef } from "react";
import { ANNOUNCEMENT_COLORS } from "@/lib/announcement-constants";
import { playSuccess } from "@/lib/sounds";

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

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const playedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        // Check login status
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        setIsLoggedIn(!!meData.user);

        // Fetch current announcements (no-cache for real-time)
        const res = await fetch("/api/announcements/current", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list: Announcement[] = data.announcements ?? [];
        setAnnouncements(list);

        // Play sound for new announcements that have sound enabled
        for (const ann of list) {
          if (ann.sound_enabled && !playedRef.current.has(ann.id)) {
            playedRef.current.add(ann.id);
            // Small delay so it doesn't fire before the page is interactive
            setTimeout(() => playSuccess(0.2), 500);
            break; // Only play once even if multiple sound-enabled announcements
          }
        }
      } catch {
        // Silently fail — announcements are non-critical
      }
    }

    load();
  }, []);

  async function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));

    if (isLoggedIn) {
      try {
        await fetch(`/api/announcements/${id}/dismiss`, { method: "POST" });
      } catch {
        // Silently fail
      }
    }
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-6 animate-fade-in">
      {visible.map((ann) => {
        const meta = ANNOUNCEMENT_COLORS.find((c) => c.id === ann.color);
        return (
          <div
            key={ann.id}
            className={`rounded-2xl border p-4 ${meta?.bg ?? "bg-blue-950/30"} ${meta?.border ?? "border-blue-700/50"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${meta?.text ?? "text-blue-300"}`}
                  >
                    📢 From Developer
                  </span>
                  {ann.sound_enabled && (
                    <span className="text-xs text-yellow-400">🔔</span>
                  )}
                  <span className="text-xs text-zinc-500">{timeAgo(ann.created_at)}</span>
                </div>
                <p className="font-black text-white">{ann.title}</p>
                <p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">{ann.message}</p>
              </div>
              <button
                onClick={() => handleDismiss(ann.id)}
                className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-zinc-400 hover:bg-white/10 transition"
                aria-label="Dismiss announcement"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
