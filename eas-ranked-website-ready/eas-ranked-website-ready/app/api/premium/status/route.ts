import { NextRequest, NextResponse } from "next/server";
import { isPremiumUser } from "@/lib/premium";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const premium = await isPremiumUser(userId);
  return NextResponse.json({ userId, premium });
}
