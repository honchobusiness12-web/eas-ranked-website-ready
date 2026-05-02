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

interface RankBadgeProps {
  cr: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function RankBadge({ cr, size = "md", showLabel = true }: RankBadgeProps) {
  const rankName = getRank(cr);
  const color = getTierColor(rankName);
  const icon = getTierIcon(rankName);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
    lg: "px-4 py-2 text-sm gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-bold ${sizeClasses}`}
      style={{ borderColor: `${color}60`, backgroundColor: `${color}18`, color }}
      title={`${rankName} — ${cr} CR`}
    >
      <span>{icon}</span>
      {showLabel && <span>{rankName}</span>}
    </span>
  );
}
