import { NextRequest, NextResponse } from "next/server";
import { getCosmetics, upsertCosmetics, isPremiumUser } from "@/lib/premium";
import { getSession } from "@/lib/auth";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function isValidHex(value: unknown): boolean {
  return typeof value === "string" && HEX_RE.test(value);
}

/** gradient_color is stored as "color1,color2" — validate both parts */
function isValidGradient(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const parts = value.split(",");
  return parts.length === 2 && parts.every((p) => HEX_RE.test(p.trim()));
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const cosmetics = await getCosmetics(userId);
  return NextResponse.json({ cosmetics });
}

export async function POST(req: NextRequest) {
  try {
    // Require an authenticated session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, ...data } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Only allow users to edit their own cosmetics
    if (userId !== session.userId) {
      return NextResponse.json(
        { error: "You can only edit your own cosmetics" },
        { status: 403 }
      );
    }

    const premium = await isPremiumUser(userId);
    if (!premium) {
      return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
    }

    // Validate optional color fields
    if (data.profile_color !== undefined && data.profile_color !== null && !isValidHex(data.profile_color)) {
      return NextResponse.json({ error: "Invalid profile_color — must be #RRGGBB" }, { status: 400 });
    }
    if (data.username_color !== undefined && data.username_color !== null && !isValidHex(data.username_color)) {
      return NextResponse.json({ error: "Invalid username_color — must be #RRGGBB" }, { status: 400 });
    }
    if (data.gradient_color !== undefined && data.gradient_color !== null && !isValidGradient(data.gradient_color)) {
      return NextResponse.json({ error: "Invalid gradient_color — must be '#RRGGBB,#RRGGBB'" }, { status: 400 });
    }

    await upsertCosmetics(userId, data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
