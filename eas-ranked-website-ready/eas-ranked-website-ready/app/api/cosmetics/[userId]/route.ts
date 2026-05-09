import { NextRequest, NextResponse } from "next/server";
import { getPlayerCosmetics } from "@/lib/cosmetics";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const cosmetics = await getPlayerCosmetics(userId);

  return NextResponse.json(
    { cosmetics },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
