import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { upsertSubscription, ensurePremiumTables } from "@/lib/premium";

// ---------------------------------------------------------------------------
// POST /api/premium/webhook
// ---------------------------------------------------------------------------
// Receives premium status updates from the Discord bot or any trusted source.
// Authenticates via the shared WEBHOOK_SECRET, then upserts the subscription
// row and invalidates the relevant Next.js cache paths so the profile page
// reflects the new status on the next request.
//
// Expected body:
// {
//   "user_id": "733871667788644445",
//   "subscription_status": "active" | "canceled" | "past_due" | "expired",
//   "current_period_end": "2099-12-31T23:59:59Z"   // optional ISO string
// }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Authenticate using the shared webhook secret
  // ------------------------------------------------------------------
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[premium/webhook] WEBHOOK_SECRET env var is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (providedSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ------------------------------------------------------------------
  // 2. Parse and validate the request body
  // ------------------------------------------------------------------
  let body: {
    user_id?: string;
    subscription_status?: string;
    current_period_end?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = body?.user_id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid user_id" },
      { status: 400 }
    );
  }

  const validStatuses = ["active", "canceled", "past_due", "expired"];
  const status = body?.subscription_status;
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      {
        error: `Invalid subscription_status. Must be one of: ${validStatuses.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // 3. Ensure tables exist and upsert the subscription record
  // ------------------------------------------------------------------
  await ensurePremiumTables();

  await upsertSubscription(userId, {
    subscription_status: status as
      | "active"
      | "canceled"
      | "past_due"
      | "expired",
    current_period_end: body?.current_period_end ?? null,
  });

  // ------------------------------------------------------------------
  // 4. Invalidate Next.js cache so the profile page reflects the change
  //    on the very next request (no stale ISR window)
  // ------------------------------------------------------------------
  revalidatePath(`/profile/${userId}`);
  revalidatePath("/");

  console.log(
    `[premium/webhook] Updated subscription for user ${userId}: status=${status}`
  );

  return NextResponse.json(
    {
      ok: true,
      userId,
      subscription_status: status,
    },
    { status: 200 }
  );
}
