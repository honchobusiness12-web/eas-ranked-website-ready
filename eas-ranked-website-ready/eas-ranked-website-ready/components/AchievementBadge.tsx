"use client";

import type { Achievement } from "@/lib/achievements";
import { useTheme } from "@/components/ThemeProvider";

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "sm" | "md";
}

export default function AchievementBadge({ achievement, size = "md" }: AchievementBadgeProps) {
  const isLocked = !achievement.unlocked;
  const { theme } = useTheme();
  const isLight = theme === "light";

  const sizeClasses = size === "sm"
    ? "p-2 text-xl"
    : "p-3 text-2xl";

  return (
    <div
      className={`relative flex flex-col items-center gap-1 rounded-xl border transition group ${
        isLocked
          ? isLight
            ? "border-black/8 bg-black/3 opacity-40 grayscale"
            : "border-white/5 bg-white/3 opacity-40 grayscale"
          : isLight
            ? "border-purple-400/40 bg-purple-50 hover:border-purple-500/70 shadow-sm"
            : "border-purple-700/40 bg-purple-950/20 hover:border-purple-500/60"
      } ${sizeClasses}`}
      title={`${achievement.name}: ${achievement.description}${isLocked ? " (Locked)" : ""}`}
    >
      <span className={isLocked ? "opacity-50" : ""}>{achievement.icon}</span>
      {size === "md" && (
        <span className={`text-center text-xs font-bold leading-tight ${
          isLocked
            ? isLight ? "text-[#9090b8]" : "text-zinc-600"
            : isLight ? "text-[#3d3d5c]" : "text-zinc-300"
        }`}>
          {achievement.name}
        </span>
      )}
      {/* Tooltip */}
      <div className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs opacity-0 shadow-xl transition group-hover:opacity-100 z-10 ${
        isLight
          ? "border-black/10 bg-white text-[#3d3d5c] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          : "border-white/10 bg-[#0d0d14] text-zinc-300"
      }`}>
        <p className={`font-bold ${isLight ? "text-[#0f0f1a]" : "text-white"}`}>{achievement.name}</p>
        <p className={`mt-0.5 ${isLight ? "text-[#7070a0]" : "text-zinc-400"}`}>{achievement.description}</p>
        {isLocked && <p className="mt-1 text-red-500">🔒 Locked</p>}
        {!isLocked && <p className="mt-1 text-green-600">✅ Unlocked</p>}
      </div>
    </div>
  );
}
