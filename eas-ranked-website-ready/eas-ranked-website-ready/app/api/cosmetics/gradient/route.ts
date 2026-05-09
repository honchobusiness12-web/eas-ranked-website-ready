import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateBadgeGradient, GRADIENT_PRESETS, getPlayerCosmetics } from "@/lib/cosmetics";
import { isPremiumUser } from "@/lib/premium";

// GET /api/cosmetics/gradient?userId=... — public, anyone can view any user's gradient
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const cosmetics = await getPlayerCosmetics(userId);
    return NextResponse.json({ cosmetics });
  } catch (err) {
    console.error("[api/cosmetics/gradient] GET failed:", err);
    return NextResponse.json({ error: "Failed to load gradient" }, { status: 500 });
  }
}

// POST /api/cosmetics/gradient — authenticated, users can only update their own gradient
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { userId?: string; gradientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, gradientId } = body;

  // If a userId was provided in the request body, verify it matches the session
  if (userId && userId !== session.userId) {
    console.warn(
      `[api/cosmetics/gradient] Ownership violation: session user ${session.userId} attempted to update gradient for ${userId}`
    );
    return NextResponse.json(
      { error: "You can only update your own cosmetics" },
      { status: 403 }
    );
  }

  if (!gradientId) {
    return NextResponse.json({ error: "gradientId is required" }, { status: 400 });
  }

  const validIds = GRADIENT_PRESETS.map((g) => g.id);
  if (!validIds.includes(gradientId)) {
    return NextResponse.json({ error: "Invalid gradient preset" }, { status: 400 });
  }

  const premium = await isPremiumUser(session.userId);
  if (!premium) {
    return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
  }

  try {
    await updateBadgeGradient(session.userId, gradientId);
    return NextResponse.json({ success: true, gradientId });
  } catch (err) {
    console.error("[api/cosmetics/gradient] POST failed:", err);
    return NextResponse.json({ error: "Failed to update gradient" }, { status: 500 });
  }
}
