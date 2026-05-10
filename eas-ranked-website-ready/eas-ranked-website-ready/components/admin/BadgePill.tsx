"use client";

// ---------------------------------------------------------------------------
// BadgePill — displays a single badge with an optional remove button
// ---------------------------------------------------------------------------

export interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const BADGE_DEFINITIONS: Record<string, BadgeInfo> = {
  staff: {
    id: "staff",
    label: "Staff",
    icon: "👮",
    color: "#00FF88",
    description: "EAS Ranked Staff Member",
  },
  contentCreator: {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    description: "Verified Content Creator",
  },
  tournamentWinner: {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    description: "Tournament Champion",
  },
  developer: {
    id: "developer",
    label: "Developer",
    icon: "👑",
    color: "#FFD700",
    description: "EAS Ranked Developer",
  },
  premium: {
    id: "premium",
    label: "Premium",
    icon: "💎",
    color: "#FF9F43",
    description: "Premium Subscriber",
  },
};

interface BadgePillProps {
  /** Badge ID string (e.g. "staff") or a full BadgeInfo object */
  badge: string | BadgeInfo;
  onRemove?: () => void;
  removing?: boolean;
}

export function BadgePill({ badge, onRemove, removing }: BadgePillProps) {
  const info: BadgeInfo =
    typeof badge === "string"
      ? (BADGE_DEFINITIONS[badge] ?? {
          id: badge,
          label: badge,
          icon: "🏷️",
          color: "#888888",
          description: badge,
        })
      : badge;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black shadow-md"
      style={{
        background: `linear-gradient(135deg, ${info.color}33, ${info.color}18)`,
        border: `1.5px solid ${info.color}80`,
        color: info.color,
      }}
      title={info.description}
    >
      <span>{info.icon}</span>
      <span>{info.label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="ml-0.5 opacity-50 hover:opacity-100 transition text-xs leading-none disabled:cursor-not-allowed"
          title={`Remove ${info.label}`}
          aria-label={`Remove ${info.label} badge`}
        >
          {removing ? "⟳" : "✕"}
        </button>
      )}
    </span>
  );
}
