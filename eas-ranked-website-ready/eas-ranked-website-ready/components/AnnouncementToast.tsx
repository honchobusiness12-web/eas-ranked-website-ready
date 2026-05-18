"use client";

import { useEffect, useRef, useState } from "react";
import { useAnnouncements, type Announcement } from "@/components/AnnouncementProvider";
import { ANNOUNCEMENT_COLORS } from "@/lib/announcement-constants";

// ---------------------------------------------------------------------------
// Time-ago helper
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Single toast card
// ---------------------------------------------------------------------------

interface ToastCardProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
  index: number;
}

function ToastCard({ announcement: ann, onDismiss, index }: ToastCardProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meta = ANNOUNCEMENT_COLORS.find((c) => c.id === ann.color);

  // Stagger entrance animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    timerRef.current = setTimeout(() => handleDismiss(), 12_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ann.id]);

  function handleDismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(ann.id), 350);
  }

  // Color accent values
  const accentHex = meta?.hex ?? "#0099FF";
  const bgClass = meta?.bg ?? "bg-blue-950/30";
  const borderClass = meta?.border ?? "border-blue-700/50";
  const textClass = meta?.text ?? "text-blue-300";

  return (
    <div
      className={`announcement-toast-card relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${bgClass} ${borderClass} ${
        visible && !exiting
          ? "announcement-toast-enter"
          : exiting
          ? "announcement-toast-exit"
          : "announcement-toast-hidden"
      }`}
      style={{
        minWidth: 320,
        maxWidth: 420,
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${accentHex}30, 0 0 24px ${accentHex}20`,
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Animated top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${accentHex}, transparent)` }}
      />

      {/* Auto-dismiss progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 announcement-toast-progress"
        style={{ background: accentHex, opacity: 0.5 }}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Pulsing dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: accentHex }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: accentHex }}
              />
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
              📢 Announcement
            </span>
            {ann.sound_enabled && (
              <span className="text-xs text-yellow-400" title="Sound notification">🔔</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-zinc-600">{timeAgo(ann.created_at)}</span>
            <button
              onClick={handleDismiss}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[10px] text-zinc-500 transition-all hover:bg-white/[0.10] hover:text-zinc-200"
              aria-label="Dismiss announcement"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-2.5 pl-4">
          <p className="text-sm font-black text-white leading-snug">{ann.title}</p>
          {ann.message && (
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap line-clamp-3">
              {ann.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast stack — renders all pending announcements
// ---------------------------------------------------------------------------

export default function AnnouncementToast() {
  const { pending, dismiss } = useAnnouncements();

  if (pending.length === 0) return null;

  // Show at most 3 toasts at once to avoid overwhelming the screen
  const visible = pending.slice(0, 3);

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      aria-label="Announcements"
    >
      {visible.map((ann, i) => (
        <div key={ann.id} className="pointer-events-auto">
          <ToastCard announcement={ann} onDismiss={dismiss} index={i} />
        </div>
      ))}
      {pending.length > 3 && (
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-bold text-zinc-400 backdrop-blur-xl">
          +{pending.length - 3} more
        </div>
      )}
    </div>
  );
}
