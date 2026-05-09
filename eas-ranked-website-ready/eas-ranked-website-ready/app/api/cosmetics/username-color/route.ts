import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateUsernameColor, USERNAME_COLORS } from "@/lib/cosmetics";
import { isPremiumUser } from "@/lib/premium";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { colorId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { colorId } = body;
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
    console.error("[api/cosmetics/username-color] Failed:", err);
    return NextResponse.json({ error: "Failed to update username color" }, { status: 500 });
  }
}
