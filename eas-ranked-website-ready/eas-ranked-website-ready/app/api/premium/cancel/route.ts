import { NextRequest, NextResponse } from "next/server";
import { upsertSubscription, getSubscription } from "@/lib/premium";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const sub = await getSubscription(userId);
    if (!sub) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    // If a Lemonsqueezy subscription ID exists, cancel via their API
    if (sub.lemonsqueezy_subscription_id && process.env.LEMONSQUEEZY_API_KEY) {
      const lsRes = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${sub.lemonsqueezy_subscription_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
            Accept: "application/vnd.api+json",
          },
        }
      );
      if (!lsRes.ok) {
        const err = await lsRes.text();
        console.error("[premium] Lemonsqueezy cancel failed:", err);
        return NextResponse.json({ error: "Failed to cancel with payment provider" }, { status: 502 });
      }
    }

    await upsertSubscription(userId, { subscription_status: "canceled" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
