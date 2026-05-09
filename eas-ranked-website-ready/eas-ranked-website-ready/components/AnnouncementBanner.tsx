"use client";

import { useState, useEffect, useCallback } from "react";
import { useSounds } from "@/components/SoundProvider";

interface Announcement {
  id: string;
  title: string;
  message: string;
  color: string;
  sound_enabled: boolean;
  created_at: string;
}

const SEEN_KEY = "eas-seen-announcements";

function getSeenIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markSeen(id: string): void {
  try {
    const seen = getSeenIds();
    if (!seen.includes(id)) {
      seen.push(id);
      // Keep only the last 50 seen IDs to avoid unbounded growth
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-50)));
    }
  } catch {
    // ignore
  }
}

export default function AnnouncementBanner() {
  const sounds = useSounds();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
    if (announcement) markSeen(announcement.id);
  }, [announcement]);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch("/api/announcements/list");
        if (!res.ok) return;
        const data = await res.json();
        const list: Announcement[] = data.announcements ?? [];
        if (list.length === 0) return;

        const seen = getSeenIds();
        // Find the newest unseen announcement
        const unseen = list.find((a) => !seen.includes(a.id));
        if (!unseen) return;

        setAnnouncement(unseen);
        // Small delay so the page has rendered before the banner slides in
        setTimeout(() => {
          setVisible(true);
          if (unseen.sound_enabled) {
            sounds.success();
          }
        }, 800);
      } catch {
        // silently ignore
      }
    }

    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => dismiss(), 10_000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  if (!announcement || dismissed) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-full max-w-sm transition-all duration-400 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          borderColor: `${announcement.color}40`,
          background: `linear-gradient(135deg, #0d0d14, ${announcement.color}18)`,
          boxShadow: `0 8px 32px ${announcement.color}20`,
        }}
      >
        {/* Colored top bar */}
        <div className="h-1 w-full" style={{ backgroundColor: announcement.color }} />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📢</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm" style={{ color: announcement.color }}>
                {announcement.title}
              </p>
              <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                {announcement.message}
              </p>
              <p className="mt-2 text-[10px] text-zinc-600">
                {new Date(announcement.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={dismiss}
              className="flex-shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition"
              aria-label="Dismiss announcement"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
