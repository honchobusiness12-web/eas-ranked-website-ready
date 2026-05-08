import { NextRequest, NextResponse } from "next/server";
import { getCosmetics, upsertCosmetics, isPremiumUser } from "@/lib/premium";

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
