"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Announcement {
  id: string;
  title: string;
  message: string;
  color: string;
  sound_enabled: boolean;
  created_by: string;
  created_at: string;
  dismissed_by: string[];
}

interface AnnouncementContextValue {
  /** Announcements that have not been dismissed locally */
  pending: Announcement[];
  /** Dismiss an announcement (locally + server-side if logged in) */
  dismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AnnouncementContext = createContext<AnnouncementContextValue>({
  pending: [],
  dismiss: () => {},
});

export function useAnnouncements() {
  return useContext(AnnouncementContext);
}

// ---------------------------------------------------------------------------
// localStorage helpers — track which announcements have been seen/dismissed
// ---------------------------------------------------------------------------

const LS_KEY = "eas_dismissed_announcements";

function getLocalDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

function addLocalDismissed(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalDismissed();
    current.add(id);
    // Keep only the last 100 dismissed IDs to avoid unbounded growth
    const arr = Array.from(current).slice(-100);
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export default function AnnouncementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playedRef = useRef<Set<string>>(new Set());

  // Initialise local dismissed set from localStorage on mount
  useEffect(() => {
    setLocalDismissed(getLocalDismissed());
  }, []);

  // Check login status once
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsLoggedIn(!!d.user))
      .catch(() => {});
  }, []);

  // ---------------------------------------------------------------------------
  // Merge incoming announcements — only add new ones, don't remove existing
  // ---------------------------------------------------------------------------
  const mergeAnnouncements = useCallback((incoming: Announcement[]) => {
    setAnnouncements((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const newOnes = incoming.filter((a) => !existingIds.has(a.id));
      if (newOnes.length === 0) return prev;
      return [...prev, ...newOnes];
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Play sound for new sound-enabled announcements
  // ---------------------------------------------------------------------------
  const playSoundForNew = useCallback((incoming: Announcement[]) => {
    for (const ann of incoming) {
      if (ann.sound_enabled && !playedRef.current.has(ann.id)) {
        playedRef.current.add(ann.id);
        // Delayed slightly so AudioContext is unlocked by user interaction
        setTimeout(async () => {
          try {
            const { playSuccess } = await import("@/lib/sounds");
            playSuccess(0.2);
          } catch {
            // Silently fail
          }
        }, 600);
        break; // Only play once per batch
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SSE connection with polling fallback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let sseActive = false;

    function handleData(data: { announcements: Announcement[] }) {
      const list = data.announcements ?? [];
      mergeAnnouncements(list);
      playSoundForNew(list);
    }

    // Try SSE first
    if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
      try {
        const es = new EventSource("/api/announcements/subscribe");
        eventSourceRef.current = es;

        es.addEventListener("announcements", (e: MessageEvent) => {
          try {
            handleData(JSON.parse(e.data));
          } catch {
            // Ignore parse errors
          }
        });

        es.onerror = () => {
          // SSE failed — fall back to polling
          es.close();
          eventSourceRef.current = null;
          if (!sseActive) startPolling();
        };

        es.onopen = () => {
          sseActive = true;
        };
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    // Polling fallback — every 20 seconds
    function startPolling() {
      async function poll() {
        try {
          const res = await fetch("/api/announcements/current", {
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            handleData(data);
          }
        } catch {
          // Silently fail
        }
      }

      poll(); // Immediate first poll
      pollTimerRef.current = setInterval(poll, 20_000);
    }

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [mergeAnnouncements, playSoundForNew]);

  // ---------------------------------------------------------------------------
  // Dismiss handler
  // ---------------------------------------------------------------------------
  const dismiss = useCallback(
    (id: string) => {
      // Update local state immediately
      setLocalDismissed((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      addLocalDismissed(id);

      // Persist to server if logged in
      if (isLoggedIn) {
        fetch(`/api/announcements/${id}/dismiss`, { method: "POST" }).catch(
          () => {}
        );
      }
    },
    [isLoggedIn]
  );

  // ---------------------------------------------------------------------------
  // Compute pending (not locally dismissed)
  // ---------------------------------------------------------------------------
  const pending = announcements.filter((a) => !localDismissed.has(a.id));

  return (
    <AnnouncementContext.Provider value={{ pending, dismiss }}>
      {children}
    </AnnouncementContext.Provider>
  );
}
