import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getDiscordUser,
  createSession,
  getAvatarUrl,
} from "@/lib/auth";
import { syncPremiumFromDiscord } from "@/lib/discord-sync";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/auth/login?error=access_denied", req.url));
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const discordUser = await getDiscordUser(accessToken);

    await createSession({
      userId: discordUser.id,
      accessToken,
      discordUser,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Sync premium status from Discord roles on every login
    try {
      await syncPremiumFromDiscord(discordUser.id);
    } catch (syncErr) {
      // Non-fatal — log and continue
      console.warn("[auth] Premium sync failed (non-fatal):", syncErr);
    }

    // Update player avatar in database on every login
    try {
      const avatarUrl = getAvatarUrl(discordUser);
      if (avatarUrl) {
        await pool.query(
          `UPDATE players SET data = jsonb_set(data, '{avatar_url}', to_jsonb($1::text)) WHERE user_id = $2`,
          [avatarUrl, discordUser.id]
        );
      }
    } catch (err) {
      console.warn("[auth] Failed to update avatar:", err);
    }

    // Redirect to the user's profile page
    return NextResponse.redirect(new URL(`/profile/${discordUser.id}`, req.url));
  } catch (err) {
    console.error("[auth] Discord OAuth callback error:", err);
    return NextResponse.redirect(new URL("/auth/login?error=oauth_failed", req.url));
  }
}
