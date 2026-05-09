// ---------------------------------------------------------------------------
// Cosmetic constants — no database imports, safe for Client Components
// ---------------------------------------------------------------------------

export const THEMES = [
  { id: "dark",      label: "Dark",      preview: "#05050b", available: true,  icon: "🌑" },
  { id: "neon",      label: "Neon",      preview: "#0a0a1a", available: true,  icon: "💡" },
  { id: "gradient",  label: "Gradient",  preview: "#1a0e05", available: true,  icon: "🌈" },
  { id: "summer",    label: "Summer",    preview: "#1f1005", available: true,  icon: "☀️" },
  { id: "cyberpunk", label: "Cyberpunk", preview: "#0d0d1a", available: true,  icon: "🤖" },
  { id: "ocean",     label: "Ocean",     preview: "#051520", available: true,  icon: "🌊" },
  { id: "forest",    label: "Forest",    preview: "#051505", available: false, icon: "🌲" },
];

export const RANK_BADGE_STYLES = [
  { id: "default",     label: "Default",      available: true,  icon: "🏅" },
  { id: "glowing",     label: "Glowing",      available: true,  icon: "✨" },
  { id: "pulsing",     label: "Pulsing",      available: true,  icon: "💫" },
  { id: "gradient",    label: "Gradient",     available: true,  icon: "🌈" },
  { id: "holographic", label: "Holographic",  available: false, icon: "🔮" },
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
  { id: "default",  label: "Default",  available: true,  icon: "⬜" },
  { id: "gold",     label: "Gold",     available: true,  icon: "🥇" },
  { id: "diamond",  label: "Diamond",  available: true,  icon: "💎" },
  { id: "fire",     label: "Fire",     available: false, icon: "🔥" },
  { id: "ice",      label: "Ice",      available: false, icon: "❄️" },
];

// ---------------------------------------------------------------------------
// Premium commands / features list — used by the /premium/commands page
// ---------------------------------------------------------------------------

export const PREMIUM_COMMANDS = [
  {
    icon: "📊",
    title: "Advanced Stats Dashboard",
    description:
      "Deep-dive analytics: win/loss trends, KDA graphs, CR gain/loss breakdown, consistency metrics, and rank progression timeline.",
    href: "/premium/stats",
    status: "available" as const,
  },
  {
    icon: "🎨",
    title: "Custom Cosmetics",
    description:
      "Personalise your profile with themes, rank badge styles, player titles, profile colours, and achievement frames.",
    href: "/premium/cosmetics",
    status: "available" as const,
  },
  {
    icon: "⚔️",
    title: "Comparison History",
    description:
      "Save your favourite player comparisons, view history, and compare multiple players at once.",
    href: "/premium/comparisons",
    status: "available" as const,
  },
  {
    icon: "🔍",
    title: "Custom Leaderboard Filters",
    description:
      "Filter by rank tier, win rate, recent activity, and more. Save your custom filter presets.",
    href: "/leaderboard",
    status: "available" as const,
  },
  {
    icon: "📥",
    title: "Export Stats",
    description:
      "Export your player stats as PDF, CSV, or image — complete with charts and graphs.",
    href: "/premium/export",
    status: "available" as const,
  },
  {
    icon: "📜",
    title: "Full Match History",
    description:
      "Detailed match-by-match breakdown with performance metrics and analytics.",
    href: "/premium/matches",
    status: "available" as const,
  },
  {
    icon: "🎯",
    title: "Progress Tracker",
    description:
      "Track your improvement over time, set goals, view milestones, and compare to previous seasons.",
    href: "/premium/tracker",
    status: "available" as const,
  },
  {
    icon: "💎",
    title: "Premium Badge",
    description:
      "Show off your premium status with a gold badge on your profile and leaderboard row.",
    href: "/premium/manage",
    status: "available" as const,
  },
];
