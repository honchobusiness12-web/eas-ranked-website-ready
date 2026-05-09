import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Premium Role ID (Discord)
// ---------------------------------------------------------------------------
export const PREMIUM_ROLE_ID = "1502426990995836928";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Subscription {
  id: string;
  user_id: string;
  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_subscription_id: string | null;
  subscription_status: "active" | "canceled" | "past_due" | "expired" | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cosmetics {
  id: string;
  user_id: string;
  theme: string | null;
  profile_banner: string | null;
  rank_badge_style: string | null;
  player_title: string | null;
  profile_color: string | null;
  achievement_frame: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DB initialisation — create tables if they don't exist
// ---------------------------------------------------------------------------

export async function ensurePremiumTables(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL UNIQUE,
        lemonsqueezy_customer_id VARCHAR(255),
        lemonsqueezy_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50),
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cosmetics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL UNIQUE,
        theme VARCHAR(50) DEFAULT 'dark',
        profile_banner VARCHAR(255),
        rank_badge_style VARCHAR(50) DEFAULT 'default',
        player_title VARCHAR(100),
        profile_color VARCHAR(50) DEFAULT '#FF6B6B',
        achievement_frame VARCHAR(50) DEFAULT 'default',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error("[premium] ensurePremiumTables failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Check premium status
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has premium access from ANY source:
 *  1. Developer user ID (permanent)
 *  2. Owner user IDs from OWNER_USER_IDS env var (permanent)
 *  3. Active Lemonsqueezy subscription
 *  4. Active giveaway code premium (premium_expires_at > now)
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  // Developer gets permanent premium access
  if (userId === DEVELOPER_USER_ID) {
    return true;
  }

  // Owner IDs get permanent premium access
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ownerIds.includes(userId)) {
    return true;
  }

  try {
    await ensurePremiumTables();

    // Check Lemonsqueezy subscription
    const subResult = await pool.query(
      `SELECT subscription_status FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (subResult.rows.length > 0 && subResult.rows[0].subscription_status === "active") {
      return true;
    }

    // Check active giveaway code premium
    const giveawayResult = await pool.query(
      `
      SELECT 1
      FROM players
      WHERE user_id           = $1
        AND premium_expires_at IS NOT NULL
        AND premium_expires_at  > NOW()
      LIMIT 1
      `,
      [userId]
    );
    if (giveawayResult.rows.length > 0) {
      return true;
    }

    return false;
  } catch (err) {
    console.error(`[premium] isPremiumUser(${userId}) failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Subscription helpers
// ---------------------------------------------------------------------------

export async function getSubscription(userId: string): Promise<Subscription | null> {
  try {
    await ensurePremiumTables();
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error(`[premium] getSubscription(${userId}) failed:`, err);
    return null;
  }
}

export async function upsertSubscription(
  userId: string,
  data: Partial<Omit<Subscription, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  try {
    await ensurePremiumTables();
    await pool.query(
      `
      INSERT INTO subscriptions (user_id, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, subscription_status, current_period_end)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET
        lemonsqueezy_customer_id     = EXCLUDED.lemonsqueezy_customer_id,
        lemonsqueezy_subscription_id = EXCLUDED.lemonsqueezy_subscription_id,
        subscription_status          = EXCLUDED.subscription_status,
        current_period_end           = EXCLUDED.current_period_end,
        updated_at                   = NOW()
      `,
      [
        userId,
        data.lemonsqueezy_customer_id ?? null,
        data.lemonsqueezy_subscription_id ?? null,
        data.subscription_status ?? null,
        data.current_period_end ?? null,
      ]
    );
  } catch (err) {
    console.error(`[premium] upsertSubscription(${userId}) failed:`, err);
  }
}

// ---------------------------------------------------------------------------
// Cosmetics helpers
// ---------------------------------------------------------------------------

export async function getCosmetics(userId: string): Promise<Cosmetics | null> {
  try {
    await ensurePremiumTables();
    const result = await pool.query(
      `SELECT * FROM cosmetics WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error(`[premium] getCosmetics(${userId}) failed:`, err);
    return null;
  }
}

export async function upsertCosmetics(
  userId: string,
  data: Partial<Omit<Cosmetics, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  try {
    await ensurePremiumTables();
    await pool.query(
      `
      INSERT INTO cosmetics (user_id, theme, profile_banner, rank_badge_style, player_title, profile_color, achievement_frame)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        theme              = EXCLUDED.theme,
        profile_banner     = EXCLUDED.profile_banner,
        rank_badge_style   = EXCLUDED.rank_badge_style,
        player_title       = EXCLUDED.player_title,
        profile_color      = EXCLUDED.profile_color,
        achievement_frame  = EXCLUDED.achievement_frame,
        updated_at         = NOW()
      `,
      [
        userId,
        data.theme ?? "dark",
        data.profile_banner ?? null,
        data.rank_badge_style ?? "default",
        data.player_title ?? null,
        data.profile_color ?? "#FF6B6B",
        data.achievement_frame ?? "default",
      ]
    );
  } catch (err) {
    console.error(`[premium] upsertCosmetics(${userId}) failed:`, err);
  }
}

// ---------------------------------------------------------------------------
// Developer / Staff / Badge helpers
// ---------------------------------------------------------------------------

/** The one and only developer user ID. */
export const DEVELOPER_USER_ID = "733871667788644445";

/**
 * Discord role IDs that grant the Staff badge.
 * Add any additional staff / moderator role IDs here.
 */
export const STAFF_ROLE_IDS = [
  "1502426990995836929", // example staff role — replace with real ID(s)
];

/**
 * Discord role IDs that grant the Content Creator badge.
 * Covers "Active Developer" and "Verified Bot Developer" equivalents.
 */
export const CONTENT_CREATOR_ROLE_IDS = [
  "1502426990995836930", // example content-creator role — replace with real ID(s)
];

export interface UserBadge {
  id: "developer" | "contentCreator" | "staff" | "premium";
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Returns true if the user holds a staff role in the DB player record.
 * The player `data` JSON blob may contain a `roles` array of Discord role IDs.
 */
export async function isStaffUser(userId: string): Promise<boolean> {
  // Developer is implicitly staff
  if (userId === DEVELOPER_USER_ID) return true;

  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return false;
    const roles: string[] = result.rows[0].roles ?? [];
    return STAFF_ROLE_IDS.some((id) => roles.includes(id));
  } catch (err) {
    console.error(`[premium] isStaffUser(${userId}) failed:`, err);
    return false;
  }
}

/**
 * Returns true if the user holds a content-creator role in the DB player record.
 */
export async function isContentCreator(userId: string): Promise<boolean> {
  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return false;
    const roles: string[] = result.rows[0].roles ?? [];
    return CONTENT_CREATOR_ROLE_IDS.some((id) => roles.includes(id));
  } catch (err) {
    console.error(`[premium] isContentCreator(${userId}) failed:`, err);
    return false;
  }
}

/**
 * Returns the full list of badges a user has earned.
 * Order: developer → contentCreator → staff → premium.
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const [developer, contentCreator, staff, premium] = await Promise.all([
    Promise.resolve(userId === DEVELOPER_USER_ID),
    isContentCreator(userId),
    isStaffUser(userId),
    isPremiumUser(userId),
  ]);

  const badges: UserBadge[] = [];

  if (developer) {
    badges.push({
      id: "developer",
      label: "Developer",
      icon: "👑",
      color: "#FFD700",
      description: "EAS Ranked Developer",
    });
  }

  if (contentCreator) {
    badges.push({
      id: "contentCreator",
      label: "Content Creator",
      icon: "🎙️",
      color: "#00D4FF",
      description: "Verified Content Creator",
    });
  }

  // Staff badge shown for non-developer staff members only (developer already has a badge)
  if (staff && !developer) {
    badges.push({
      id: "staff",
      label: "Staff",
      icon: "👮",
      color: "#00FF88",
      description: "EAS Ranked Staff Member",
    });
  }

  if (premium) {
    badges.push({
      id: "premium",
      label: "Premium",
      icon: "💎",
      color: "#FF9F43",
      description: "Premium Subscriber",
    });
  }

  return badges;
}

// ---------------------------------------------------------------------------
// Scrim hosting — waitlist bypass logic
// ---------------------------------------------------------------------------

/**
 * Determines whether a user is allowed to host a scrim.
 *
 * Rules:
 *  - Premium subscribers: always allowed (no limits).
 *  - Waitlist members:    allowed (bypass normal scrim limits as a perk).
 *  - Everyone else:       subject to normal limits (caller enforces these).
 *
 * Returns `{ allowed: boolean; reason: string }` so callers can surface a
 * meaningful message when access is denied.
 */
export async function canHostScrim(
  userId: string,
  isOnWaitlist: boolean
): Promise<{ allowed: boolean; reason: string }> {
  // Premium users have no restrictions
  const premium = await isPremiumUser(userId);
  if (premium) {
    return { allowed: true, reason: "premium" };
  }

  // Waitlist members bypass the normal scrim limit as an early-access perk
  if (isOnWaitlist) {
    return { allowed: true, reason: "waitlist" };
  }

  // Regular users are subject to normal limits — the caller decides the cap
  return { allowed: false, reason: "limit_reached" };
}

// ---------------------------------------------------------------------------
// Available cosmetic options — re-exported from premium-constants so that
// server-side callers can continue importing from this module unchanged.
// ---------------------------------------------------------------------------

export {
  THEMES,
  RANK_BADGE_STYLES,
  PLAYER_TITLES,
  PROFILE_COLORS,
  ACHIEVEMENT_FRAMES,
} from "@/lib/premium-constants";

// ---------------------------------------------------------------------------
// CR Edit Audit — types & helpers
// ---------------------------------------------------------------------------

export interface CRAuditEntry {
  id: string;
  user_id: string;
  player_id: string;
  old_cr: number;
  new_cr: number;
  reason: string | null;
  edited_at: string;
  edited_by: string;
  reversible: boolean;
  /** Joined from players table — display name of the affected player */
  player_name?: string;
}

/**
 * Idempotently create the cr_edit_audit table.
 * Called automatically by logCREdit / getCRAuditLog / rollbackCREdit.
 */
async function ensureCRAuditTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cr_edit_audit (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    VARCHAR(32) NOT NULL,
        player_id  VARCHAR(32) NOT NULL,
        old_cr     INT         NOT NULL,
        new_cr     INT         NOT NULL,
        reason     TEXT,
        edited_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        edited_by  VARCHAR(32) NOT NULL,
        reversible BOOLEAN     NOT NULL DEFAULT TRUE
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_cr_audit_player_id ON cr_edit_audit(player_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_cr_audit_edited_by ON cr_edit_audit(edited_by)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_cr_audit_edited_at ON cr_edit_audit(edited_at DESC)`
    );
  } catch (err) {
    console.error("[premium] ensureCRAuditTable failed:", err);
  }
}

/**
 * Write a single CR change to the audit log.
 * Does NOT update the players table — the caller is responsible for that.
 */
export async function logCREdit(opts: {
  editedBy: string;
  playerId: string;
  oldCr: number;
  newCr: number;
  reason?: string;
  reversible?: boolean;
}): Promise<CRAuditEntry | null> {
  try {
    await ensureCRAuditTable();
    const result = await pool.query<CRAuditEntry>(
      `
      INSERT INTO cr_edit_audit
        (user_id, player_id, old_cr, new_cr, reason, edited_by, reversible)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        opts.playerId,
        opts.playerId,
        opts.oldCr,
        opts.newCr,
        opts.reason ?? null,
        opts.editedBy,
        opts.reversible ?? true,
      ]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error("[premium] logCREdit failed:", err);
    return null;
  }
}

/**
 * Fetch the CR audit log with optional filters.
 * Results are ordered newest-first.
 */
export async function getCRAuditLog(opts?: {
  playerId?: string;
  editedBy?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}): Promise<CRAuditEntry[]> {
  try {
    await ensureCRAuditTable();

    const conditions: string[] = [];
    const params: (string | number | Date)[] = [];
    let idx = 1;

    if (opts?.playerId) {
      conditions.push(`a.player_id = ${idx++}`);
      params.push(opts.playerId);
    }
    if (opts?.editedBy) {
      conditions.push(`a.edited_by = ${idx++}`);
      params.push(opts.editedBy);
    }
    if (opts?.since) {
      conditions.push(`a.edited_at >= ${idx++}`);
      params.push(opts.since);
    }
    if (opts?.until) {
      conditions.push(`a.edited_at <= ${idx++}`);
      params.push(opts.until);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(opts?.limit ?? 100, 500);
    const offset = opts?.offset ?? 0;

    const result = await pool.query<CRAuditEntry>(
      `
      SELECT
        a.*,
        COALESCE(p.data->>'display_name', p.data->>'username', a.player_id) AS player_name
      FROM cr_edit_audit a
      LEFT JOIN players p ON p.user_id = a.player_id
      ${where}
      ORDER BY a.edited_at DESC
      LIMIT ${idx++} OFFSET ${idx++}
      `,
      [...params, limit, offset]
    );

    return result.rows;
  } catch (err) {
    console.error("[premium] getCRAuditLog failed:", err);
    return [];
  }
}

/**
 * Rollback a single CR edit by its audit log ID.
 * Restores the player's CR to old_cr and logs the reversal.
 * Returns the new audit entry for the rollback, or null on failure.
 */
export async function rollbackCREdit(
  auditId: string,
  rolledBackBy: string
): Promise<{ ok: boolean; entry?: CRAuditEntry; error?: string }> {
  const client = await pool.connect();
  try {
    await ensureCRAuditTable();
    await client.query("BEGIN");

    // Fetch the original audit entry
    const auditResult = await client.query<CRAuditEntry>(
      `SELECT * FROM cr_edit_audit WHERE id = $1 FOR UPDATE`,
      [auditId]
    );
    if (auditResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "Audit entry not found." };
    }

    const entry = auditResult.rows[0];
    if (!entry.reversible) {
      await client.query("ROLLBACK");
      return { ok: false, error: "This edit is marked as non-reversible." };
    }

    // Fetch current CR so we can log it accurately
    const playerResult = await client.query(
      `SELECT COALESCE((data->>'cr')::int, 0) AS cr FROM players WHERE user_id = $1`,
      [entry.player_id]
    );
    if (playerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "Player not found." };
    }
    const currentCr: number = playerResult.rows[0].cr;

    // Restore CR in the players table
    await client.query(
      `UPDATE players SET data = jsonb_set(data, '{cr}', $1::text::jsonb) WHERE user_id = $2`,
      [entry.old_cr, entry.player_id]
    );

    // Mark original entry as no longer reversible (prevent double-rollback)
    await client.query(
      `UPDATE cr_edit_audit SET reversible = FALSE WHERE id = $1`,
      [auditId]
    );

    // Log the rollback itself
    const rollbackEntry = await client.query<CRAuditEntry>(
      `
      INSERT INTO cr_edit_audit
        (user_id, player_id, old_cr, new_cr, reason, edited_by, reversible)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      RETURNING *
      `,
      [
        entry.player_id,
        entry.player_id,
        currentCr,
        entry.old_cr,
        `Rollback of audit entry ${auditId}`,
        rolledBackBy,
      ]
    );

    await client.query("COMMIT");
    return { ok: true, entry: rollbackEntry.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[premium] rollbackCREdit failed:", err);
    return { ok: false, error: "An unexpected error occurred during rollback." };
  } finally {
    client.release();
  }
}

/**
 * Rollback all CR edits made within a time range.
 * Each affected player's CR is restored to what it was before the earliest
 * edit in the range. Returns the number of players rolled back.
 */
export async function rollbackCREditRange(opts: {
  since: Date;
  until: Date;
  rolledBackBy: string;
}): Promise<{ ok: boolean; count: number; error?: string }> {
  const client = await pool.connect();
  try {
    await ensureCRAuditTable();
    await client.query("BEGIN");

    // Find all reversible edits in the range, ordered oldest-first per player
    const editsResult = await client.query<CRAuditEntry>(
      `
      SELECT DISTINCT ON (player_id)
        id, player_id, old_cr, new_cr, edited_at
      FROM cr_edit_audit
      WHERE edited_at >= $1
        AND edited_at <= $2
        AND reversible = TRUE
      ORDER BY player_id, edited_at ASC
      `,
      [opts.since, opts.until]
    );

    if (editsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: true, count: 0 };
    }

    let count = 0;
    for (const edit of editsResult.rows) {
      // Get current CR
      const playerResult = await client.query(
        `SELECT COALESCE((data->>'cr')::int, 0) AS cr FROM players WHERE user_id = $1`,
        [edit.player_id]
      );
      if (playerResult.rows.length === 0) continue;
      const currentCr: number = playerResult.rows[0].cr;

      // Restore CR
      await client.query(
        `UPDATE players SET data = jsonb_set(data, '{cr}', $1::text::jsonb) WHERE user_id = $2`,
        [edit.old_cr, edit.player_id]
      );

      // Mark all edits in range for this player as non-reversible
      await client.query(
        `
        UPDATE cr_edit_audit
        SET reversible = FALSE
        WHERE player_id = $1
          AND edited_at >= $2
          AND edited_at <= $3
        `,
        [edit.player_id, opts.since, opts.until]
      );

      // Log the rollback
      await client.query(
        `
        INSERT INTO cr_edit_audit
          (user_id, player_id, old_cr, new_cr, reason, edited_by, reversible)
        VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        `,
        [
          edit.player_id,
          edit.player_id,
          currentCr,
          edit.old_cr,
          `Bulk rollback of edits from ${opts.since.toISOString()} to ${opts.until.toISOString()}`,
          opts.rolledBackBy,
        ]
      );

      count++;
    }

    await client.query("COMMIT");
    return { ok: true, count };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[premium] rollbackCREditRange failed:", err);
    return { ok: false, count: 0, error: "An unexpected error occurred during bulk rollback." };
  } finally {
    client.release();
  }
}
