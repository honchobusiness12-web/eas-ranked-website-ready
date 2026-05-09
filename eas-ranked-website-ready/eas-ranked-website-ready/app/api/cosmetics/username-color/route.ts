import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateUsernameColor, USERNAME_COLORS, getPlayerCosmetics } from "@/lib/cosmetics";
import { isPremiumUser } from "@/lib/premium";

// GET /api/cosmetics/username-color?userId=... — public, anyone can view any user's color
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const cosmetics = await getPlayerCosmetics(userId);
    return NextResponse.json({ cosmetics });
  } catch (err) {
    console.error("[api/cosmetics/username-color] GET failed:", err);
    return NextResponse.json({ error: "Failed to load username color" }, { status: 500 });
  }
}

// POST /api/cosmetics/username-color — authenticated, users can only update their own color
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { userId?: string; colorId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, colorId } = body;

  // If a userId was provided in the request body, verify it matches the session
  if (userId && userId !== session.userId) {
    console.warn(
      `[api/cosmetics/username-color] Ownership violation: session user ${session.userId} attempted to update color for ${userId}`
    );
    return NextResponse.json(
      { error: "You can only update your own cosmetics" },
      { status: 403 }
    );
  }

  if (!colorId) {
    return NextResponse.json({ error: "colorId is required" }, { status: 400 });
  }

  const validIds = USERNAME_COLORS.map((c) => c.id);
  if (!validIds.includes(colorId)) {
    return NextResponse.json({ error: "Invalid color option" }, { status: 400 });
  }

  const premium = await isPremiumUser(session.userId);
  if (!premium) {
    return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
  }

  try {
    await updateUsernameColor(session.userId, colorId);
    return NextResponse.json({ success: true, colorId });
  } catch (err) {
    console.error("[api/cosmetics/username-color] POST failed:", err);
    return NextResponse.json({ error: "Failed to update username color" }, { status: 500 });
  }
}
