import { getRank } from "@/lib/ranks";
import { getTierColor } from "@/lib/charts";

const TIER_ICONS: Record<string, string> = {
  "R1 Rookie":        "🔰",
  "R2 Amateur":       "🟢",
  "R3 Pro":           "🔵",
  "R4 Elite":         "🟣",
  "R5 All-Star":      "🌟",
  "R6 SuperStar":     "🔴",
  "R7 Remorseless":   "💥",
  "R8 Legend":        "🔶",
  "R9 Unreal":        "🌀",
  "R10 Hall Of Fame": "🏆",
};

function getTierIcon(rankName: string): string {
  for (const [tier, icon] of Object.entries(TIER_ICONS)) {
    if (rankName.startsWith(tier)) return icon;
  }
  return "🎮";
}

export type RankBadgeStyle =
  | "default"
  | "glowing"
  | "pulsing"
  | "gradient"
  | "holographic";

interface RankBadgeProps {
  cr: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  badgeStyle?: RankBadgeStyle | string | null;
  /** Custom gradient colors [from, to] — used when badgeStyle === "gradient" */
  gradientColors?: string[] | null;
}

function buildStyleProps(
  color: string,
  badgeStyle: RankBadgeStyle | string | null | undefined,
  gradientColors?: string[] | null
): React.CSSProperties {
  const base: React.CSSProperties = {
    borderColor: `${color}60`,
    backgroundColor: `${color}18`,
    color,
  };

  switch (badgeStyle) {
    case "glowing":
      return {
        ...base,
        boxShadow: `0 0 12px ${color}80, 0 0 24px ${color}40`,
      };
    case "gradient":
      if (gradientColors && gradientColors.length === 2) {
        return {
          background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})`,
          borderColor: "transparent",
          color: "#fff",
        };
      }
      return {
        ...base,
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        borderColor: `${color}80`,
      };
    case "holographic":
      return {
        ...base,
        background: `linear-gradient(135deg, ${color}40, #ffffff18, ${color}30)`,
        borderColor: `${color}90`,
        boxShadow: `0 0 16px ${color}60, inset 0 0 8px rgba(255,255,255,0.08)`,
      };
    default:
      return base;
  }
}

export default function RankBadge({
  cr,
  size = "md",
  showLabel = true,
  badgeStyle = "default",
  gradientColors = null,
}: RankBadgeProps) {
  const rankName = getRank(cr);
  const color = getTierColor(rankName);
  const icon = getTierIcon(rankName);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
    lg: "px-4 py-2 text-sm gap-2",
  }[size];

  // "pulsing" needs a Tailwind animation class; others are pure inline styles
  const isPulsing = badgeStyle === "pulsing";

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-bold ${sizeClasses}${isPulsing ? " animate-pulse" : ""}`}
      style={buildStyleProps(color, badgeStyle, gradientColors)}
      title={`${rankName} — ${cr} CR`}
    >
      <span>{icon}</span>
      {showLabel && <span>{rankName}</span>}
    </span>
  );
}
