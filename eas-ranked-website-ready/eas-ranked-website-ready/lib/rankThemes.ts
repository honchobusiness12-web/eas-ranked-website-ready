/**
 * rankThemes.ts
 * Returns dynamic theme colors based on a player's rank name.
 * Used across profile pages, badges, and activity feeds.
 */

export interface RankTheme {
  /** Main accent color (hex) */
  primary: string;
  /** Secondary accent color (hex) */
  secondary: string;
  /** Glow effect color (rgba string) */
  glow: string;
  /** CSS background gradient string */
  gradient: string;
  /** Badge background (rgba string) */
  badge: string;
  /** Whether this rank should show an animated glow */
  animated: boolean;
}

const THEMES: Record<string, RankTheme> = {
  // ── R1 Rookie ──────────────────────────────────────────────────────────
  "R1 Rookie": {
    primary:   "#6b7280",
    secondary: "#4b5563",
    glow:      "rgba(107,114,128,0.45)",
    gradient:  "linear-gradient(135deg, rgba(107,114,128,0.18) 0%, rgba(75,85,99,0.10) 100%)",
    badge:     "rgba(107,114,128,0.15)",
    animated:  false,
  },
  // ── R2 Amateur ─────────────────────────────────────────────────────────
  "R2 Amateur": {
    primary:   "#10b981",
    secondary: "#059669",
    glow:      "rgba(16,185,129,0.45)",
    gradient:  "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.10) 100%)",
    badge:     "rgba(16,185,129,0.15)",
    animated:  false,
  },
  // ── R3 Pro ─────────────────────────────────────────────────────────────
  "R3 Pro": {
    primary:   "#3b82f6",
    secondary: "#6366f1",
    glow:      "rgba(59,130,246,0.50)",
    gradient:  "linear-gradient(135deg, rgba(59,130,246,0.20) 0%, rgba(99,102,241,0.12) 100%)",
    badge:     "rgba(59,130,246,0.15)",
    animated:  false,
  },
  // ── R4 Elite ───────────────────────────────────────────────────────────
  "R4 Elite": {
    primary:   "#8b5cf6",
    secondary: "#a855f7",
    glow:      "rgba(139,92,246,0.55)",
    gradient:  "linear-gradient(135deg, rgba(139,92,246,0.22) 0%, rgba(168,85,247,0.14) 100%)",
    badge:     "rgba(139,92,246,0.18)",
    animated:  false,
  },
  // ── R5 All-Star ────────────────────────────────────────────────────────
  "R5 All-Star": {
    primary:   "#f59e0b",
    secondary: "#ec4899",
    glow:      "rgba(245,158,11,0.55)",
    gradient:  "linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(236,72,153,0.14) 100%)",
    badge:     "rgba(245,158,11,0.18)",
    animated:  false,
  },
  // ── R6 SuperStar ───────────────────────────────────────────────────────
  "R6 SuperStar": {
    primary:   "#ef4444",
    secondary: "#f97316",
    glow:      "rgba(239,68,68,0.55)",
    gradient:  "linear-gradient(135deg, rgba(239,68,68,0.22) 0%, rgba(249,115,22,0.14) 100%)",
    badge:     "rgba(239,68,68,0.18)",
    animated:  false,
  },
  // ── R7 Remorseless ─────────────────────────────────────────────────────
  "R7 Remorseless": {
    primary:   "#ec4899",
    secondary: "#8b5cf6",
    glow:      "rgba(236,72,153,0.60)",
    gradient:  "linear-gradient(135deg, rgba(236,72,153,0.24) 0%, rgba(139,92,246,0.16) 100%)",
    badge:     "rgba(236,72,153,0.20)",
    animated:  true,
  },
  // ── R8 Legend ──────────────────────────────────────────────────────────
  "R8 Legend": {
    primary:   "#f97316",
    secondary: "#fbbf24",
    glow:      "rgba(249,115,22,0.65)",
    gradient:  "linear-gradient(135deg, rgba(249,115,22,0.26) 0%, rgba(251,191,36,0.18) 100%)",
    badge:     "rgba(249,115,22,0.22)",
    animated:  true,
  },
  // ── R9 Unreal ──────────────────────────────────────────────────────────
  "R9 Unreal": {
    primary:   "#06b6d4",
    secondary: "#a855f7",
    glow:      "rgba(6,182,212,0.65)",
    gradient:  "linear-gradient(135deg, rgba(6,182,212,0.26) 0%, rgba(168,85,247,0.18) 100%)",
    badge:     "rgba(6,182,212,0.22)",
    animated:  true,
  },
  // ── R10 Hall Of Fame ───────────────────────────────────────────────────
  "R10 Hall Of Fame": {
    primary:   "#fbbf24",
    secondary: "#a855f7",
    glow:      "rgba(251,191,36,0.70)",
    gradient:  "linear-gradient(135deg, rgba(251,191,36,0.30) 0%, rgba(168,85,247,0.22) 50%, rgba(251,191,36,0.18) 100%)",
    badge:     "rgba(251,191,36,0.25)",
    animated:  true,
  },
};

/**
 * Returns the RankTheme for a given rank name string.
 * Matches by tier prefix (e.g. "R3 Pro High" → "R3 Pro" theme).
 */
export function getRankTheme(rankName: string): RankTheme {
  for (const [tier, theme] of Object.entries(THEMES)) {
    if (rankName.startsWith(tier)) return theme;
  }
  // Fallback to Rookie
  return THEMES["R1 Rookie"];
}
