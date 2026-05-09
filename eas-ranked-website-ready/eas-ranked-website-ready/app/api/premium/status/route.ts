import { NextRequest, NextResponse } from "next/server";
import { isPremiumUser, isContentCreator } from "@/lib/premium";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const [premium, contentCreator] = await Promise.all([
    isPremiumUser(userId),
    isContentCreator(userId),
  ]);

  return NextResponse.json({ userId, premium, contentCreator });
}
