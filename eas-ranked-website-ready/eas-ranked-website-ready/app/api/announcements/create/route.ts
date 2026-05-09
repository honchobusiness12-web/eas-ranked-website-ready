import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAnnouncement } from "@/lib/announcements";

const DEVELOPER_ID = "733871667788644445";
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

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
    const { title, message, color, sound_enabled, ping_role_id } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }
    if (color && !HEX_RE.test(color)) {
      return NextResponse.json({ error: "color must be a valid hex code (#RRGGBB)." }, { status: 400 });
    }

    const announcement = await createAnnouncement({
      title: title.trim(),
      message: message.trim(),
      color: color || "#FF9F43",
      sound_enabled: sound_enabled !== false,
      ping_role_id: ping_role_id || null,
      created_by: session.userId,
    });

    return NextResponse.json({ success: true, announcement });
  } catch (err) {
    console.error("[announcements/create] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
