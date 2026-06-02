/**
 * Avatar database sync helpers for EAS Arena.
 *
 * These functions read and write avatar data in the `players` table.
 * The players table stores all player data as a JSONB `data` column, so
 * avatar fields live inside that JSON object.
 *
 * We also support dedicated top-level columns (avatar_hash, avatar_updated_at)
 * when the migration has been applied — but gracefully fall back to the JSONB
 * path so the app keeps working before the migration runs.
 */

import { pool } from "@/lib/db";
import {
  buildDiscordAvatarUrl,
  buildDiscordDefaultAvatarUrl,
  isValidAvatarUrl,
  refreshPlayerAvatarFromDiscord,
} from "@/lib/avatar-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvatarRecord {
  avatarUrl: string | null;
  avatarHash: string | null;
  updatedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Retrieve the stored avatar URL for a player.
 * Validates the URL before returning — returns null if it looks broken.
 */
export async function getPlayerAvatarUrl(
  userId: string
): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT data->>'avatar_url' AS avatar_url FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    const url: string | null = result.rows[0]?.avatar_url ?? null;
    return isValidAvatarUrl(url) ? url : null;
  } catch (err) {
    console.error(`[avatar-sync] getPlayerAvatarUrl(${userId}) failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Persist an updated avatar URL into the player's JSONB data column.
 * Also writes avatar_hash so we can rebuild the URL later if needed.
 *
 * @param userId        - Discord user ID
 * @param avatarHash    - Raw Discord avatar hash (e.g. "a_abc123") or null
 * @param discriminator - Discord discriminator for default avatar fallback
 */
export async function updatePlayerAvatarUrl(
  userId: string,
  avatarHash: string | null,
  discriminator = "0"
): Promise<void> {
  const avatarUrl =
    buildDiscordAvatarUrl(userId, avatarHash) ??
    buildDiscordDefaultAvatarUrl(userId, discriminator);

  try {
    await pool.query(
      `UPDATE players
       SET data = jsonb_set(
                   jsonb_set(data, '{avatar_url}',  to_jsonb($2::text)),
                   '{avatar_hash}', to_jsonb($3::text)
                 )
       WHERE user_id = $1`,
      [userId, avatarUrl, avatarHash ?? ""]
    );
  } catch (err) {
    console.error(`[avatar-sync] updatePlayerAvatarUrl(${userId}) failed:`, err);
  }
}

// ---------------------------------------------------------------------------
// Sync from Discord API
// ---------------------------------------------------------------------------

/**
 * Fetch the latest avatar from the Discord API and update the database.
 * Returns the new avatar URL, or the existing stored URL on failure.
 *
 * @param userId      - Discord user ID
 * @param accessToken - OAuth access token (required to call Discord API)
 * @param discriminator - Discriminator for default avatar fallback
 */
export async function syncPlayerAvatarFromDiscord(
  userId: string,
  accessToken?: string,
  discriminator = "0"
): Promise<string | null> {
  // Try to get a fresh URL from Discord
  const freshUrl = await refreshPlayerAvatarFromDiscord(userId, accessToken);

  if (freshUrl) {
    // Extract the hash from the URL so we can store it separately
    const hashMatch = freshUrl.match(/\/avatars\/\d+\/([^.?]+)/);
    const hash = hashMatch?.[1] ?? null;

    await updatePlayerAvatarUrl(userId, hash, discriminator);
    return freshUrl;
  }

  // Fall back to whatever is already stored
  return getPlayerAvatarUrl(userId);
}
