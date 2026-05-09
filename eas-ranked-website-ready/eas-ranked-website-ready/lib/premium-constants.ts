// ---------------------------------------------------------------------------
// Cosmetic constants — no database imports, safe for Client Components
// ---------------------------------------------------------------------------

export const THEMES = [
  { id: "dark",      label: "Dark",      icon: "🎨", preview: "#05050b", available: true },
  { id: "neon",      label: "Neon",      icon: "🌟", preview: "#0a0a1a", available: true },
  { id: "gradient",  label: "Gradient",  icon: "🌈", preview: "#1a0e05", available: true },
  { id: "summer",    label: "Summer",    icon: "☀️", preview: "#1f1005", available: true },
  { id: "cyberpunk", label: "Cyberpunk", icon: "🤖", preview: "#0d0d1a", available: true },
  { id: "ocean",     label: "Ocean",     icon: "🌊", preview: "#051520", available: true },
  { id: "forest",    label: "Forest",    icon: "🌲", preview: "#051505", available: false },
  { id: "midnight",  label: "Midnight",  icon: "🌙", preview: "#050510", available: false },
  { id: "volcano",   label: "Volcano",   icon: "🌋", preview: "#1a0500", available: false },
];

export const RANK_BADGE_STYLES = [
  { id: "default",     label: "Default",      icon: "⭐", available: true },
  { id: "glowing",     label: "Glowing",      icon: "✨", available: true },
  { id: "pulsing",     label: "Pulsing",      icon: "💫", available: true },
  { id: "gradient",    label: "Gradient",     icon: "🌟", available: true },
  { id: "holographic", label: "Holographic",  icon: "🔮", available: false },
  { id: "animated",    label: "Animated",     icon: "🎬", available: false },
  { id: "neon_glow",   label: "Neon Glow",    icon: "💡", available: false },
];

export const PLAYER_TITLES = [
  "🔥 Grinder",
  "⚡ Clutch King",
  "👑 Legend",
  "💀 Destroyer",
  "🎯 Sharpshooter",
  "🛡️ Defender",
  "🚀 Rocketeer",
  "🌊 Wave Rider",
  "🦁 Alpha",
  "🐉 Dragon",
  "⚔️ Warrior",
  "🏆 Champion",
  "🌟 All-Star",
  "💎 Diamond",
  "🔮 Mystic",
  "🎮 Gamer",
  "🥇 Elite",
  "🌪️ Tornado",
  "🦅 Eagle Eye",
  "🔱 Poseidon",
  "⚡ Thunderstrike",
  "🌑 Shadow",
  "🎯 Headhunter",
  "🏹 Archer",
  "🔥 Inferno",
];

export const PROFILE_COLORS = [
  { id: "#FF6B6B", label: "Coral",   icon: "🔴" },
  { id: "#FF9F43", label: "Orange",  icon: "🟠" },
  { id: "#FFD93D", label: "Yellow",  icon: "🟡" },
  { id: "#00D4FF", label: "Teal",    icon: "🔵" },
  { id: "#0099FF", label: "Blue",    icon: "💙" },
  { id: "#00FF88", label: "Lime",    icon: "🟢" },
  { id: "#FF6BFF", label: "Pink",    icon: "🩷" },
  { id: "#A855F7", label: "Purple",  icon: "🟣" },
  { id: "#EF4444", label: "Red",     icon: "❤️" },
  { id: "#FFFFFF", label: "White",   icon: "⚪" },
  { id: "#FFD700", label: "Gold",    icon: "🌟" },
  { id: "#00FFFF", label: "Cyan",    icon: "🩵" },
  { id: "#FF4500", label: "Crimson", icon: "🔥" },
  { id: "#7CFC00", label: "Green",   icon: "💚" },
  { id: "#FF69B4", label: "Hot Pink",icon: "🌸" },
];

// ---------------------------------------------------------------------------
// Gradient presets — applied to rank badges, banners, and profile accents
// ---------------------------------------------------------------------------

export const GRADIENT_PRESETS = [
  { id: "none",       label: "None",         colors: null },
  { id: "fire",       label: "Fire",         colors: ["#FF4500", "#FF9F43"] },
  { id: "ocean",      label: "Ocean",        colors: ["#0099FF", "#00D4FF"] },
  { id: "sunset",     label: "Sunset",       colors: ["#FF6B6B", "#FF9F43", "#FFD93D"] },
  { id: "neon",       label: "Neon",         colors: ["#00FF88", "#00D4FF"] },
  { id: "purple",     label: "Purple Haze",  colors: ["#A855F7", "#FF6BFF"] },
  { id: "gold",       label: "Gold Rush",    colors: ["#FFD700", "#FF9F43"] },
  { id: "midnight",   label: "Midnight",     colors: ["#0099FF", "#A855F7"] },
  { id: "toxic",      label: "Toxic",        colors: ["#00FF88", "#FFD93D"] },
  { id: "crimson",    label: "Crimson",      colors: ["#EF4444", "#FF6BFF"] },
];

/** Build a CSS linear-gradient string from a gradient preset ID. */
export function buildGradientCSS(gradientId: string, direction = "90deg"): string | null {
  const preset = GRADIENT_PRESETS.find((g) => g.id === gradientId);
  if (!preset || !preset.colors) return null;
  return `linear-gradient(${direction}, ${preset.colors.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Banner options — full banner customization
// ---------------------------------------------------------------------------

export const BANNER_COLORS = [
  { id: "default",   label: "Default",    color: null,      gradient: null },
  { id: "coral",     label: "Coral",      color: "#FF6B6B", gradient: null },
  { id: "ocean",     label: "Ocean",      color: "#0099FF", gradient: null },
  { id: "forest",    label: "Forest",     color: "#00FF88", gradient: null },
  { id: "purple",    label: "Purple",     color: "#A855F7", gradient: null },
  { id: "gold",      label: "Gold",       color: "#FFD700", gradient: null },
  { id: "fire_grad", label: "Fire",       color: null,      gradient: "linear-gradient(135deg, #FF4500, #FF9F43)" },
  { id: "ocean_grad",label: "Ocean Wave", color: null,      gradient: "linear-gradient(135deg, #0099FF, #00D4FF)" },
  { id: "sunset",    label: "Sunset",     color: null,      gradient: "linear-gradient(135deg, #FF6B6B, #FF9F43, #FFD93D)" },
  { id: "neon_grad", label: "Neon",       color: null,      gradient: "linear-gradient(135deg, #00FF88, #00D4FF)" },
  { id: "purple_grad",label: "Nebula",    color: null,      gradient: "linear-gradient(135deg, #A855F7, #FF6BFF)" },
  { id: "midnight",  label: "Midnight",   color: null,      gradient: "linear-gradient(135deg, #0099FF, #A855F7)" },
];

export const BANNER_PATTERNS = [
  { id: "none",      label: "None",       icon: "⬛", available: true },
  { id: "dots",      label: "Dots",       icon: "⚫", available: true },
  { id: "grid",      label: "Grid",       icon: "🔲", available: true },
  { id: "waves",     label: "Waves",      icon: "〰️", available: false },
  { id: "stars",     label: "Stars",      icon: "✨", available: false },
  { id: "hexagon",   label: "Hexagon",    icon: "⬡",  available: false },
];

export const ACHIEVEMENT_FRAMES = [
  { id: "default",  label: "Default",  icon: "🖼️", available: true },
  { id: "gold",     label: "Gold",     icon: "🏆", available: true },
  { id: "diamond",  label: "Diamond",  icon: "💎", available: true },
  { id: "fire",     label: "Fire",     icon: "🔥", available: false },
  { id: "ice",      label: "Ice",      icon: "❄️", available: false },
  { id: "neon",     label: "Neon",     icon: "💡", available: false },
  { id: "shadow",   label: "Shadow",   icon: "🌑", available: false },
];

// ---------------------------------------------------------------------------
// Profile effects (coming soon)
// ---------------------------------------------------------------------------

export const PROFILE_EFFECTS = [
  { id: "none",      label: "None",         icon: "⬛", available: true },
  { id: "sparkle",   label: "Sparkle",      icon: "✨", available: false },
  { id: "fire",      label: "Fire",         icon: "🔥", available: false },
  { id: "snow",      label: "Snow",         icon: "❄️", available: false },
  { id: "lightning", label: "Lightning",    icon: "⚡", available: false },
  { id: "confetti",  label: "Confetti",     icon: "🎊", available: false },
];
