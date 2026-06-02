/**
 * POST /api/avatar/refresh
 *
 * Manually refresh a player's avatar from the Discord API.
 * Requires the caller to be authenticated (uses their session access token).
 *
 * Body: { userId: string }
 *
 * Returns: { avatarUrl: string | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncPlayerAvatarFromDiscord, getPlayerAvatarUrl } from "@/lib/avatar-sync";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Only allow users to refresh their own avatar (or admins — checked via
    // OWNER_USER_IDS env var).
    const ownerIds = (process.env.OWNER_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const isOwner = ownerIds.includes(session.userId);
    const isSelf = session.userId === userId;

    if (!isSelf && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use the session access token only when refreshing the logged-in user's
    // own avatar — we can't use their token for other users.
    const accessToken = isSelf ? session.accessToken : undefined;
    const discriminator = isSelf
      ? (session.discordUser.discriminator ?? "0")
      : "0";

    const avatarUrl = await syncPlayerAvatarFromDiscord(
      userId,
      accessToken,
      discriminator
    );

    // If sync returned nothing, fall back to whatever is stored
    const finalUrl = avatarUrl ?? (await getPlayerAvatarUrl(userId));

    return NextResponse.json({ avatarUrl: finalUrl });
  } catch (err) {
    console.error("[avatar/refresh] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
