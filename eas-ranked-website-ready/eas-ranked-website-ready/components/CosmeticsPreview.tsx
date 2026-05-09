import type { Cosmetics } from "@/lib/premium";
import {
  THEMES,
  RANK_BADGE_STYLES,
  ACHIEVEMENT_FRAMES,
  PROFILE_COLORS,
  GRADIENT_PRESETS,
  USERNAME_COLORS,
} from "@/lib/premium-constants";

interface CosmeticsPreviewProps {
  cosmetics: Cosmetics;
}

function findById<T extends { id: string }>(list: T[], id: string | null | undefined): T | undefined {
  if (!id) return undefined;
  return list.find((item) => item.id === id);
}

/**
 * Displays a summary of a user's active cosmetics — theme, rank badge style,
 * achievement frame, profile colour, and player title.
 */
export default function CosmeticsPreview({ cosmetics }: CosmeticsPreviewProps) {
  const theme = findById(THEMES, cosmetics.theme);
  const badgeStyle = findById(RANK_BADGE_STYLES, cosmetics.rank_badge_style);
  const frame = findById(ACHIEVEMENT_FRAMES, cosmetics.achievement_frame);
  const profileColor = findById(PROFILE_COLORS, cosmetics.profile_color);

  const rows: { icon: string; label: string; value: string; accent?: string }[] = [];

  if (theme) {
    rows.push({
      icon: theme.icon,
      label: "Theme",
      value: theme.label,
      accent: theme.preview,
    });
  }

  if (badgeStyle) {
    rows.push({
      icon: badgeStyle.icon,
      label: "Rank Badge Style",
      value: badgeStyle.label,
    });
  }

  if (frame) {
    rows.push({
      icon: frame.icon,
      label: "Achievement Frame",
      value: frame.label,
    });
  }

  if (profileColor) {
    rows.push({
      icon: profileColor.icon,
      label: "Profile Colour",
      value: profileColor.label,
      accent: profileColor.id,
    });
  }

  if (cosmetics.player_title) {
    rows.push({
      icon: "🏷️",
      label: "Player Title",
      value: cosmetics.player_title,
    });
  }

  if (cosmetics.gradient_color) {
    const preset = findById(GRADIENT_PRESETS, cosmetics.gradient_color);
    rows.push({
      icon: preset?.icon ?? "🌈",
      label: "Badge Gradient",
      value: preset?.label ?? cosmetics.gradient_color,
      accent: cosmetics.gradient_color.split(",")[0],
    });
  }

  if (cosmetics.username_color) {
    const uColor = findById(USERNAME_COLORS, cosmetics.username_color);
    rows.push({
      icon: uColor?.icon ?? "📝",
      label: "Username Color",
      value: uColor?.label ?? cosmetics.username_color,
      accent: cosmetics.username_color,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
      <h2 className="mb-4 text-xl font-black">✨ Active Cosmetics</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>{row.icon}</span>
              <span>{row.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {row.accent && (
                <span
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ background: row.accent }}
                />
              )}
              <span className="text-sm font-black">{row.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
