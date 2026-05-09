import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteAnnouncement } from "@/lib/announcements";

const DEVELOPER_ID = "733871667788644445";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (session.userId !== DEVELOPER_ID) {
      return NextResponse.json({ error: "Developer access required." }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const deleted = await deleteAnnouncement(id);
    if (!deleted) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[announcements/delete] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
