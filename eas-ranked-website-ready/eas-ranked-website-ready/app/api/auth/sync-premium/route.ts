import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncPremiumFromDiscord } from "@/lib/discord-sync";
import { isPremiumUser } from "@/lib/premium";

/**
 * POST /api/auth/sync-premium
 *
 * Called after login to sync the user's premium status from their Discord
 * roles.  Requires an active session.
 *
 * Returns:
 *   { userId, premium, hasPremiumRole, changed }
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncPremiumFromDiscord(session.userId);
    const premium = await isPremiumUser(session.userId);

    return NextResponse.json({
      userId: session.userId,
      premium,
      hasPremiumRole: result.hasPremiumRole,
      changed: result.changed,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    });
  } catch (err) {
    console.error("[api/auth/sync-premium] Error:", err);
    return NextResponse.json({ error: "Failed to sync premium status" }, { status: 500 });
  }
}
