import { NextRequest, NextResponse } from "next/server";
import { isPremiumUser } from "@/lib/premium";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const premium = await isPremiumUser(userId);

  // Disable caching so premium status is always fresh after a purchase
  return NextResponse.json(
    { userId, premium },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
