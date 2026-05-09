// ---------------------------------------------------------------------------
// Cosmetic constants — no database imports, safe for Client Components
// ---------------------------------------------------------------------------

export const GRADIENT_PRESETS = [
  { id: "#FF6B6B,#FF9F43", label: "Sunset",     icon: "🌅", colors: ["#FF6B6B", "#FF9F43"] },
  { id: "#00D4FF,#0099FF", label: "Ocean",      icon: "🌊", colors: ["#00D4FF", "#0099FF"] },
  { id: "#A855F7,#FF6BFF", label: "Neon Purple",icon: "💜", colors: ["#A855F7", "#FF6BFF"] },
  { id: "#00FF88,#00D4FF", label: "Cyber Mint", icon: "🌿", colors: ["#00FF88", "#00D4FF"] },
  { id: "#FFD93D,#FF6B6B", label: "Fire Gold",  icon: "🔥", colors: ["#FFD93D", "#FF6B6B"] },
  { id: "#EF4444,#A855F7", label: "Crimson",    icon: "❤️‍🔥", colors: ["#EF4444", "#A855F7"] },
  { id: "#00FF88,#A855F7", label: "Aurora",     icon: "🌌", colors: ["#00FF88", "#A855F7"] },
  { id: "#FF9F43,#FFD93D", label: "Gold Rush",  icon: "✨", colors: ["#FF9F43", "#FFD93D"] },
  { id: "#0099FF,#A855F7", label: "Galaxy",     icon: "🔮", colors: ["#0099FF", "#A855F7"] },
  { id: "#FF6BFF,#FF9F43", label: "Candy",      icon: "🍬", colors: ["#FF6BFF", "#FF9F43"] },
];

export const USERNAME_COLORS = [
  { id: "#FFFFFF", label: "White",       icon: "⚪" },
  { id: "#FF6B6B", label: "Coral",       icon: "🔴" },
  { id: "#FF9F43", label: "Orange",      icon: "🟠" },
  { id: "#FFD93D", label: "Yellow",      icon: "🟡" },
  { id: "#00FF88", label: "Lime",        icon: "🟢" },
  { id: "#00D4FF", label: "Teal",        icon: "🔵" },
  { id: "#0099FF", label: "Blue",        icon: "💙" },
  { id: "#A855F7", label: "Purple",      icon: "🟣" },
  { id: "#FF6BFF", label: "Pink",        icon: "🩷" },
  { id: "#FFD700", label: "Gold",        icon: "🌟" },
  { id: "#EF4444", label: "Red",         icon: "❤️" },
  { id: "#10B981", label: "Emerald",     icon: "💚" },
];

export const THEMES = [
  { id: "dark",      label: "Dark",      icon: "🎨", preview: "#05050b", available: true },
  { id: "neon",      label: "Neon",      icon: "🌟", preview: "#0a0a1a", available: true },
  { id: "gradient",  label: "Gradient",  icon: "🌈", preview: "#1a0e05", available: true },
  { id: "summer",    label: "Summer",    icon: "☀️", preview: "#1f1005", available: true },
  { id: "cyberpunk", label: "Cyberpunk", icon: "🤖", preview: "#0d0d1a", available: true },
  { id: "ocean",     label: "Ocean",     icon: "🌊", preview: "#051520", available: true },
  { id: "forest",    label: "Forest",    icon: "🌲", preview: "#051505", available: false },
];

export const RANK_BADGE_STYLES = [
  { id: "default",     label: "Default",      icon: "⭐", available: true },
  { id: "glowing",     label: "Glowing",      icon: "✨", available: true },
  { id: "pulsing",     label: "Pulsing",      icon: "💫", available: true },
  { id: "gradient",    label: "Gradient",     icon: "🌟", available: true },
  { id: "holographic", label: "Holographic",  icon: "🔮", available: false },
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
];

export const PROFILE_COLORS = [
  { id: "#FF6B6B", label: "Coral",  icon: "🔴" },
  { id: "#FF9F43", label: "Orange", icon: "🟠" },
  { id: "#FFD93D", label: "Yellow", icon: "🟡" },
  { id: "#00D4FF", label: "Teal",   icon: "🔵" },
  { id: "#0099FF", label: "Blue",   icon: "💙" },
  { id: "#00FF88", label: "Lime",   icon: "🟢" },
  { id: "#FF6BFF", label: "Pink",   icon: "🩷" },
  { id: "#A855F7", label: "Purple", icon: "🟣" },
  { id: "#EF4444", label: "Red",    icon: "❤️" },
  { id: "#FFFFFF", label: "White",  icon: "⚪" },
];

export const ACHIEVEMENT_FRAMES = [
  { id: "default",  label: "Default",  icon: "🖼️", available: true },
  { id: "gold",     label: "Gold",     icon: "🏆", available: true },
  { id: "diamond",  label: "Diamond",  icon: "💎", available: true },
  { id: "fire",     label: "Fire",     icon: "🔥", available: false },
  { id: "ice",      label: "Ice",      icon: "❄️", available: false },
];
