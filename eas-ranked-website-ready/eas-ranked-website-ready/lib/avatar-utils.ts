/**
 * Avatar URL utilities for EAS Arena.
 *
 * Centralises all Discord CDN URL construction and validation so every
 * component uses the same logic and the same fallback chain.
 *
 * Fallback priority:
 *   1. Valid stored Discord CDN avatar URL
 *   2. Fresh URL built from stored avatar hash
 *   3. Discord default avatar (discriminator-based)
 *   4. EAS Arena placeholder
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCORD_CDN = "https://cdn.discordapp.com";
const AVATAR_SIZE = 256; // px — large enough for all display sizes

/** Absolute URL-safe placeholder served from the public folder. */
const EAS_DEFAULT_AVATAR = "/images/eas-default-avatar.svg";

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

/**
 * Build a full Discord CDN avatar URL from a user ID and avatar hash.
 * Returns null when the hash is absent (user has no custom avatar).
 */
export function buildDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null | undefined
): string | null {
  if (!userId || !avatarHash) return null;

  // Animated avatars use the GIF format; static ones use WebP for quality.
  const ext = avatarHash.startsWith("a_") ? "gif" : "webp";
  return `${DISCORD_CDN}/avatars/${userId}/${avatarHash}.${ext}?size=${AVATAR_SIZE}`;
}

/**
 * Build the Discord default avatar URL.
 * Discord uses (discriminator % 5) for legacy users and (userId >> 22) % 6
 * for the new username system.  We handle both.
 */
export function buildDiscordDefaultAvatarUrl(
  userId: string,
  discriminator: string
): string {
  let index: number;
  if (!discriminator || discriminator === "0") {
    // New username system — use the Snowflake-based formula
    index = Number((BigInt(userId) >> 22n) % 6n);
  } else {
    index = parseInt(discriminator, 10) % 5;
  }
  return `${DISCORD_CDN}/embed/avatars/${index}.png`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns true when the URL looks like a valid Discord CDN or media URL.
 * Does NOT make a network request — purely string-based.
 */
export function isValidAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "cdn.discordapp.com" ||
        parsed.hostname === "media.discordapp.net")
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

/**
 * Returns the EAS Arena default avatar placeholder path.
 * This is always a valid local asset — never broken.
 */
export function getEASDefaultAvatarUrl(): string {
  return EAS_DEFAULT_AVATAR;
}

/**
 * Resolve the best available avatar URL for a player, applying the full
 * fallback chain without making any network requests.
 *
 * @param storedUrl   - The avatar_url value from the database
 * @param userId      - Discord user ID (for default avatar fallback)
 * @param discriminator - Discord discriminator (for default avatar fallback)
 */
export function resolveAvatarUrl(
  storedUrl: string | null | undefined,
  userId?: string,
  discriminator?: string
): string {
  // 1. Valid stored URL
  if (isValidAvatarUrl(storedUrl)) return storedUrl!;

  // 2. Discord default avatar (if we have enough info)
  if (userId) {
    return buildDiscordDefaultAvatarUrl(userId, discriminator ?? "0");
  }

  // 3. EAS placeholder
  return getEASDefaultAvatarUrl();
}

/**
 * Fetch the latest Discord user object and extract the avatar hash.
 * Returns null on any failure so callers can fall back gracefully.
 */
export async function refreshPlayerAvatarFromDiscord(
  userId: string,
  accessToken?: string
): Promise<string | null> {
  if (!accessToken) return null;

  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      // Short timeout — avatar refresh is best-effort
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const user = await res.json();
    if (!user?.id || user.id !== userId) return null;

    return buildDiscordAvatarUrl(userId, user.avatar ?? null);
  } catch {
    return null;
  }
}
