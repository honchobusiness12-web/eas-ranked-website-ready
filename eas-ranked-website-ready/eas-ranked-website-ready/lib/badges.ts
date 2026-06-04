/**
 * lib/badges.ts
 *
 * Core badge system library.
 * Handles DB table initialisation, badge CRUD, audit logging, and market
 * purchase integration.  All operations are scoped to the main guild.
 */

import { pool } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { BADGE_DEFINITIONS, type BadgeDefinition } from '@/data/badges/definitions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The main EAS Arena guild ID — all badge operations are scoped to this. */
export const MAIN_GUILD_ID = '1467697766837915804';

/** Bot user ID used as `performed_by` for automated actions (purchases, etc.). */
export const BOT_USER_ID = '0';

// ---------------------------------------------------------------------------
// DB initialisation
// ---------------------------------------------------------------------------

let tablesEnsured = false;

export async function ensureBadgeTables(): Promise<void> {
  if (tablesEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_definitions (
        id          TEXT         PRIMARY KEY,
        name        TEXT         NOT NULL,
        icon        TEXT         NOT NULL,
        rarity      TEXT         NOT NULL,
        category    TEXT         NOT NULL,
        description TEXT,
        color       TEXT,
        stackable   BOOLEAN      NOT NULL DEFAULT FALSE,
        source      TEXT         NOT NULL DEFAULT 'admin',
        price       INTEGER,
        enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_badges (
        id           SERIAL       PRIMARY KEY,
        guild_id     BIGINT       NOT NULL,
        user_id      VARCHAR(32)  NOT NULL,
        badge_id     TEXT         NOT NULL,
        source       TEXT         NOT NULL DEFAULT 'admin',
        purchased_at TIMESTAMP,
        added_by     VARCHAR(32),
        added_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
        UNIQUE (guild_id, user_id, badge_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_audit_log (
        id           SERIAL       PRIMARY KEY,
        guild_id     BIGINT       NOT NULL,
        user_id      VARCHAR(32)  NOT NULL,
        badge_id     TEXT         NOT NULL,
        action       TEXT         NOT NULL,
        performed_by VARCHAR(32)  NOT NULL,
        reason       TEXT,
        created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_purchases (
        id           SERIAL       PRIMARY KEY,
        guild_id     BIGINT       NOT NULL,
        user_id      VARCHAR(32)  NOT NULL,
        badge_id     TEXT         NOT NULL,
        price_paid   INTEGER      NOT NULL,
        purchased_at TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);

    // Seed badge_definitions from the manifest (upsert so re-runs are safe)
    await seedBadgeDefinitions();

    tablesEnsured = true;
  } catch (err) {
    console.error('[badges] ensureBadgeTables failed:', err);
  }
}

async function seedBadgeDefinitions(): Promise<void> {
  for (const def of Object.values(BADGE_DEFINITIONS)) {
    await pool.query(
      `INSERT INTO badge_definitions
         (id, name, icon, rarity, category, description, color, stackable, source, price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         name        = EXCLUDED.name,
         icon        = EXCLUDED.icon,
         rarity      = EXCLUDED.rarity,
         category    = EXCLUDED.category,
         description = EXCLUDED.description,
         color       = EXCLUDED.color,
         stackable   = EXCLUDED.stackable,
         source      = EXCLUDED.source,
         price       = EXCLUDED.price,
         updated_at  = NOW()`,
      [
        def.id,
        def.name,
        def.icon,
        def.rarity,
        def.category,
        def.description,
        def.color,
        def.stackable,
        def.source,
        def.price ?? null,
      ]
    );
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerBadge {
  id: number;
  guild_id: string;
  user_id: string;
  badge_id: string;
  source: string;
  purchased_at: string | null;
  added_by: string | null;
  added_at: string;
  // Joined from badge_definitions
  name: string;
  icon: string;
  rarity: string;
  category: string;
  description: string | null;
  color: string | null;
}

export interface AuditLogEntry {
  id: number;
  guild_id: string;
  user_id: string;
  badge_id: string;
  action: string;
  performed_by: string;
  reason: string | null;
  created_at: string;
  // Joined
  badge_name: string | null;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * Returns all badges assigned to a player in the main guild, enriched with
 * definition metadata.
 */
export async function getBadgesForPlayer(userId: string): Promise<PlayerBadge[]> {
  await ensureBadgeTables();
  try {
    const result = await pool.query(
      `SELECT
         pb.id, pb.guild_id, pb.user_id, pb.badge_id,
         pb.source, pb.purchased_at, pb.added_by, pb.added_at,
         COALESCE(bd.name, pb.badge_id)  AS name,
         COALESCE(bd.icon, '')           AS icon,
         COALESCE(bd.rarity, 'common')   AS rarity,
         COALESCE(bd.category, 'custom') AS category,
         bd.description,
         bd.color
       FROM player_badges pb
       LEFT JOIN badge_definitions bd ON bd.id = pb.badge_id
       WHERE pb.guild_id = $1 AND pb.user_id = $2
       ORDER BY pb.added_at ASC`,
      [MAIN_GUILD_ID, userId]
    );
    return result.rows;
  } catch (err) {
    console.error(`[badges] getBadgesForPlayer(${userId}) failed:`, err);
    return [];
  }
}

/**
 * Returns all badge definitions (enabled only by default).
 */
export async function getAllBadgeDefinitions(includeDisabled = false): Promise<BadgeDefinition[]> {
  await ensureBadgeTables();
  try {
    const result = await pool.query(
      `SELECT id, name, icon, rarity, category, description, color, stackable, source, price
       FROM badge_definitions
       ${includeDisabled ? '' : 'WHERE enabled = TRUE'}
       ORDER BY category, name`
    );
    return result.rows as BadgeDefinition[];
  } catch (err) {
    console.error('[badges] getAllBadgeDefinitions failed:', err);
    return Object.values(BADGE_DEFINITIONS);
  }
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Adds a badge to a player.  Idempotent — silently succeeds if the player
 * already has the badge.  Writes an audit log entry.
 */
export async function addBadgeToPlayer(
  userId: string,
  badgeId: string,
  performedBy: string,
  reason?: string,
  source = 'admin'
): Promise<void> {
  await ensureBadgeTables();

  await pool.query(
    `INSERT INTO player_badges (guild_id, user_id, badge_id, source, added_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (guild_id, user_id, badge_id) DO NOTHING`,
    [MAIN_GUILD_ID, userId, badgeId, source, performedBy]
  );

  await pool.query(
    `INSERT INTO badge_audit_log (guild_id, user_id, badge_id, action, performed_by, reason)
     VALUES ($1, $2, $3, 'add', $4, $5)`,
    [MAIN_GUILD_ID, userId, badgeId, performedBy, reason ?? null]
  );

  revalidatePath(`/profile/${userId}`);
  revalidatePath('/leaderboard');
  revalidatePath('/admin/badges');
}

/**
 * Removes a badge from a player.  Writes an audit log entry.
 */
export async function removeBadgeFromPlayer(
  userId: string,
  badgeId: string,
  performedBy: string,
  reason?: string
): Promise<void> {
  await ensureBadgeTables();

  await pool.query(
    `DELETE FROM player_badges
     WHERE guild_id = $1 AND user_id = $2 AND badge_id = $3`,
    [MAIN_GUILD_ID, userId, badgeId]
  );

  await pool.query(
    `INSERT INTO badge_audit_log (guild_id, user_id, badge_id, action, performed_by, reason)
     VALUES ($1, $2, $3, 'remove', $4, $5)`,
    [MAIN_GUILD_ID, userId, badgeId, performedBy, reason ?? null]
  );

  revalidatePath(`/profile/${userId}`);
  revalidatePath('/leaderboard');
  revalidatePath('/admin/badges');
}

/**
 * Records a market badge purchase and automatically grants the badge to the
 * player.  Writes both a purchase receipt and an audit log entry.
 */
export async function handleBadgePurchase(
  userId: string,
  badgeId: string,
  price: number
): Promise<void> {
  await ensureBadgeTables();

  // Record purchase receipt
  await pool.query(
    `INSERT INTO badge_purchases (guild_id, user_id, badge_id, price_paid)
     VALUES ($1, $2, $3, $4)`,
    [MAIN_GUILD_ID, userId, badgeId, price]
  );

  // Grant badge (idempotent)
  await pool.query(
    `INSERT INTO player_badges (guild_id, user_id, badge_id, source, purchased_at, added_by)
     VALUES ($1, $2, $3, 'market', NOW(), $4)
     ON CONFLICT (guild_id, user_id, badge_id) DO NOTHING`,
    [MAIN_GUILD_ID, userId, badgeId, BOT_USER_ID]
  );

  // Audit log
  await pool.query(
    `INSERT INTO badge_audit_log (guild_id, user_id, badge_id, action, performed_by, reason)
     VALUES ($1, $2, $3, 'purchase', $4, $5)`,
    [
      MAIN_GUILD_ID,
      userId,
      badgeId,
      BOT_USER_ID,
      `Purchased from market shop for ${price} SP`,
    ]
  );

  revalidatePath(`/profile/${userId}`);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/**
 * Returns recent audit log entries, optionally filtered by userId.
 */
export async function getBadgeAuditLog(
  userId?: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  await ensureBadgeTables();
  try {
    const params: (string | number)[] = userId
      ? [MAIN_GUILD_ID, userId, limit]
      : [MAIN_GUILD_ID, limit];

    const whereUser = userId ? 'AND bal.user_id = $2' : '';
    const limitParam = userId ? '$3' : '$2';

    const result = await pool.query(
      `SELECT
         bal.id, bal.guild_id, bal.user_id, bal.badge_id,
         bal.action, bal.performed_by, bal.reason, bal.created_at,
         bd.name AS badge_name
       FROM badge_audit_log bal
       LEFT JOIN badge_definitions bd ON bd.id = bal.badge_id
       WHERE bal.guild_id = $1 ${whereUser}
       ORDER BY bal.created_at DESC
       LIMIT ${limitParam}`,
      params
    );
    return result.rows;
  } catch (err) {
    console.error('[badges] getBadgeAuditLog failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Custom badge creation
// ---------------------------------------------------------------------------

/**
 * Creates a new custom badge definition in the database.
 */
export async function createCustomBadge(def: {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  category: string;
  description?: string;
  color?: string;
}): Promise<void> {
  await ensureBadgeTables();
  await pool.query(
    `INSERT INTO badge_definitions
       (id, name, icon, rarity, category, description, color, stackable, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, 'custom')
     ON CONFLICT (id) DO UPDATE SET
       name        = EXCLUDED.name,
       icon        = EXCLUDED.icon,
       rarity      = EXCLUDED.rarity,
       category    = EXCLUDED.category,
       description = EXCLUDED.description,
       color       = EXCLUDED.color,
       updated_at  = NOW()`,
    [
      def.id,
      def.name,
      def.icon,
      def.rarity,
      def.category,
      def.description ?? null,
      def.color ?? null,
    ]
  );
}
