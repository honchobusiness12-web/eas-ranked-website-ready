import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";
import { getShopItem, getValueHistory } from "@/lib/market-shop";

function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

// ---------------------------------------------------------------------------
// GET /api/admin/market-shop/[id]/history
// Returns value history for a single item.
// Query params: limit (default 100)
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 100), 1),
    500
  );

  try {
    const item = await getShopItem(numId);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const history = await getValueHistory(item.item_id, limit);
    return NextResponse.json({ item_id: item.item_id, history });
  } catch (err) {
    console.error("[api/admin/market-shop/[id]/history] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch value history" }, { status: 500 });
  }
}
