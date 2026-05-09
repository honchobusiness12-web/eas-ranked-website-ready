import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateBadgeGradient, GRADIENT_PRESETS } from "@/lib/cosmetics";
import { isPremiumUser } from "@/lib/premium";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { gradientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { gradientId } = body;
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
    console.error("[api/cosmetics/gradient] Failed:", err);
    return NextResponse.json({ error: "Failed to update gradient" }, { status: 500 });
  }
}
