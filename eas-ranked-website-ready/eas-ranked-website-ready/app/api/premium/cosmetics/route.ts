import { NextRequest, NextResponse } from "next/server";
import { getCosmetics, upsertCosmetics, isPremiumUser } from "@/lib/premium";
import {
  THEMES,
  RANK_BADGE_STYLES,
  ACHIEVEMENT_FRAMES,
  PROFILE_COLORS,
} from "@/lib/premium-constants";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const cosmetics = await getCosmetics(userId);

  // Resolve icon for each active cosmetic so clients can display them without
  // importing the full constants bundle server-side.
  const themeIcon =
    THEMES.find((t) => t.id === cosmetics?.theme)?.icon ?? "🌑";
  const badgeIcon =
    RANK_BADGE_STYLES.find((b) => b.id === cosmetics?.rank_badge_style)?.icon ?? "🏅";
  const frameIcon =
    ACHIEVEMENT_FRAMES.find((f) => f.id === cosmetics?.achievement_frame)?.icon ?? "⬜";
  const colorIcon =
    PROFILE_COLORS.find((c) => c.id === cosmetics?.profile_color)?.icon ?? "🔴";

  return NextResponse.json({
    cosmetics,
    icons: { theme: themeIcon, badge: badgeIcon, frame: frameIcon, color: colorIcon },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...data } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const premium = await isPremiumUser(userId);
    if (!premium) {
      return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
    }

    await upsertCosmetics(userId, data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
