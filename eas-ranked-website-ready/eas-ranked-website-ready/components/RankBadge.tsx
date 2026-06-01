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
}

function buildStyleProps(
  color: string,
  badgeStyle: RankBadgeStyle | string | null | undefined
): React.CSSProperties {
  const base: React.CSSProperties = {
    borderColor: `${color}50`,
    backgroundColor: `${color}14`,
    color,
  };

  switch (badgeStyle) {
    case "glowing":
      return {
        ...base,
        boxShadow: `0 0 10px ${color}70, 0 0 20px ${color}35`,
      };
    case "gradient":
      return {
        ...base,
        background: `linear-gradient(135deg, ${color}28, ${color}10)`,
        borderColor: `${color}70`,
      };
    case "holographic":
      return {
        ...base,
        background: `linear-gradient(135deg, ${color}38, rgba(255,255,255,0.12), ${color}28)`,
        borderColor: `${color}80`,
        boxShadow: `0 0 14px ${color}55, inset 0 0 8px rgba(255,255,255,0.06)`,
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
}: RankBadgeProps) {
  const rankName = getRank(cr);
  const color = getTierColor(rankName);
  const icon = getTierIcon(rankName);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1 rounded-lg",
    md: "px-2.5 py-1 text-[11px] gap-1.5 rounded-lg",
    lg: "px-3.5 py-1.5 text-xs gap-2 rounded-xl",
  }[size];

  const isPulsing = badgeStyle === "pulsing";

  return (
    <span
      className={`inline-flex items-center border font-bold tracking-wide hover-scale-108 transition-all duration-200 ${sizeClasses}${isPulsing ? " animate-pulse" : ""}`}
      style={{
        ...buildStyleProps(color, badgeStyle),
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
      }}
      title={`${rankName} — ${cr.toLocaleString()} CR`}
    >
      <span className="leading-none">{icon}</span>
      {showLabel && <span className="leading-none">{rankName}</span>}
    </span>
  );
}
