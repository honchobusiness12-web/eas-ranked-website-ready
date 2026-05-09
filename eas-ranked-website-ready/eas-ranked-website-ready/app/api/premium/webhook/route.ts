import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { invalidatePremiumStatusCache } from "@/lib/premium";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// POST /api/premium/webhook
// ---------------------------------------------------------------------------
// Receives premium role sync events from the Discord bot (triggered by
// Buy Me a Coffee / Stripe purchases). Authenticates via the shared
// WEBHOOK_SECRET, then updates the player's data->>'premium' flag so the
// website reflects the new status on the next request.
//
// Expected body:
// {
//   "user_id": "733871667788644445",
//   "premium": true | false          // true = role granted, false = role removed
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
    premium?: boolean;
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

  if (typeof body?.premium !== "boolean") {
    return NextResponse.json(
      { error: "Missing or invalid 'premium' field — must be true or false" },
      { status: 400 }
    );
  }

  const isPremium = body.premium;

  // ------------------------------------------------------------------
  // 3. Update the player's premium flag in the players table
  // ------------------------------------------------------------------
  await pool.query(
    `
    UPDATE players
    SET data = jsonb_set(
      COALESCE(data, '{}'),
      '{premium}',
      $2::jsonb
    )
    WHERE user_id = $1
    `,
    [userId, JSON.stringify(isPremium)]
  );

  // Bust the in-process cache so the next isPremiumUser() call is fresh
  invalidatePremiumStatusCache(userId);

  // ------------------------------------------------------------------
  // 4. Invalidate Next.js cache so the profile page reflects the change
  //    on the very next request (no stale ISR window)
  // ------------------------------------------------------------------
  revalidatePath(`/profile/${userId}`);
  revalidatePath("/");

  console.log(
    `[premium/webhook] Updated Discord premium flag for user ${userId}: premium=${isPremium}`
  );

  return NextResponse.json(
    {
      ok: true,
      userId,
      premium: isPremium,
    },
    { status: 200 }
  );
}
