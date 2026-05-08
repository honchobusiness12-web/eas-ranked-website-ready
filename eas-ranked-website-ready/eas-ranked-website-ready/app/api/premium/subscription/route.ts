import { NextRequest, NextResponse } from "next/server";
import { getSubscription, upsertSubscription } from "@/lib/premium";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const subscription = await getSubscription(userId);
  return NextResponse.json({ subscription });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, ...data } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    await upsertSubscription(userId, data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
