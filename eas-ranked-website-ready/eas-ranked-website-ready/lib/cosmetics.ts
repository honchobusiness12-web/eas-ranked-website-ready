import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Gradient Presets (10 options)
// ---------------------------------------------------------------------------

export interface GradientPreset {
  id: string;
  label: string;
  from: string;
  to: string;
  css: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "orange-red",    label: "Orange → Red",    from: "#FF9F43", to: "#EF4444", css: "linear-gradient(135deg, #FF9F43, #EF4444)" },
  { id: "blue-purple",   label: "Blue → Purple",   from: "#0099FF", to: "#A855F7", css: "linear-gradient(135deg, #0099FF, #A855F7)" },
  { id: "green-cyan",    label: "Green → Cyan",    from: "#00FF88", to: "#00D4FF", css: "linear-gradient(135deg, #00FF88, #00D4FF)" },
  { id: "pink-purple",   label: "Pink → Purple",   from: "#FF6BFF", to: "#A855F7", css: "linear-gradient(135deg, #FF6BFF, #A855F7)" },
  { id: "yellow-orange", label: "Yellow → Orange", from: "#FFD93D", to: "#FF9F43", css: "linear-gradient(135deg, #FFD93D, #FF9F43)" },
  { id: "cyan-blue",     label: "Cyan → Blue",     from: "#00D4FF", to: "#0099FF", css: "linear-gradient(135deg, #00D4FF, #0099FF)" },
  { id: "lime-green",    label: "Lime → Green",    from: "#A3E635", to: "#00FF88", css: "linear-gradient(135deg, #A3E635, #00FF88)" },
  { id: "red-pink",      label: "Red → Pink",      from: "#EF4444", to: "#FF6BFF", css: "linear-gradient(135deg, #EF4444, #FF6BFF)" },
  { id: "purple-blue",   label: "Purple → Blue",   from: "#A855F7", to: "#0099FF", css: "linear-gradient(135deg, #A855F7, #0099FF)" },
  { id: "gold-orange",   label: "Gold → Orange",   from: "#FFD700", to: "#FF9F43", css: "linear-gradient(135deg, #FFD700, #FF9F43)" },
];

// ---------------------------------------------------------------------------
// Username Color Options (12 options)
// ---------------------------------------------------------------------------

export interface UsernameColor {
  id: string;
  label: string;
  hex: string;
}

export const USERNAME_COLORS: UsernameColor[] = [
  { id: "red",    label: "Red",    hex: "#EF4444" },
  { id: "orange", label: "Orange", hex: "#FF9F43" },
  { id: "yellow", label: "Yellow", hex: "#FFD93D" },
  { id: "green",  label: "Green",  hex: "#00FF88" },
  { id: "cyan",   label: "Cyan",   hex: "#00D4FF" },
  { id: "blue",   label: "Blue",   hex: "#0099FF" },
  { id: "purple", label: "Purple", hex: "#A855F7" },
  { id: "pink",   label: "Pink",   hex: "#FF6BFF" },
  { id: "white",  label: "White",  hex: "#FFFFFF" },
  { id: "gold",   label: "Gold",   hex: "#FFD700" },
  { id: "silver", label: "Silver", hex: "#C0C0C0" },
  { id: "lime",   label: "Lime",   hex: "#A3E635" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerCosmetics {
  user_id: string;
  badge_gradient: string | null;
  username_color: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Ensure table exists
// ---------------------------------------------------------------------------

async function ensurePlayerCosmeticsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_cosmetics (
        user_id        VARCHAR(32) PRIMARY KEY,
        badge_gradient VARCHAR(64),
        username_color VARCHAR(32),
        updated_at     TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error("[cosmetics] ensurePlayerCosmeticsTable failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Get player cosmetics
// ---------------------------------------------------------------------------

export async function getPlayerCosmetics(userId: string): Promise<PlayerCosmetics | null> {
  try {
    await ensurePlayerCosmeticsTable();
    const result = await pool.query<PlayerCosmetics>(
      `SELECT * FROM player_cosmetics WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error(`[cosmetics] getPlayerCosmetics(${userId}) failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Update badge gradient
// ---------------------------------------------------------------------------

export async function updateBadgeGradient(userId: string, gradientId: string): Promise<void> {
  await ensurePlayerCosmeticsTable();
  await pool.query(
    `
    INSERT INTO player_cosmetics (user_id, badge_gradient, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      badge_gradient = EXCLUDED.badge_gradient,
      updated_at     = NOW()
    `,
    [userId, gradientId]
  );
}

// ---------------------------------------------------------------------------
// Update username color
// ---------------------------------------------------------------------------

export async function updateUsernameColor(userId: string, colorId: string): Promise<void> {
  await ensurePlayerCosmeticsTable();
  await pool.query(
    `
    INSERT INTO player_cosmetics (user_id, username_color, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      username_color = EXCLUDED.username_color,
      updated_at     = NOW()
    `,
    [userId, colorId]
  );
}

// ---------------------------------------------------------------------------
// Resolve gradient CSS from preset ID
// ---------------------------------------------------------------------------

export function resolveGradientCss(gradientId: string | null | undefined): string | null {
  if (!gradientId) return null;
  return GRADIENT_PRESETS.find((g) => g.id === gradientId)?.css ?? null;
}

// ---------------------------------------------------------------------------
// Resolve username hex from color ID
// ---------------------------------------------------------------------------

export function resolveUsernameHex(colorId: string | null | undefined): string | null {
  if (!colorId) return null;
  return USERNAME_COLORS.find((c) => c.id === colorId)?.hex ?? null;
}
