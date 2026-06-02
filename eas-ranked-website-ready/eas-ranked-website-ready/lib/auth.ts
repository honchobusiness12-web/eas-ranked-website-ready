import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email?: string;
}

export interface Session {
  userId: string;
  accessToken: string;
  discordUser: DiscordUser;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Discord OAuth helpers
// ---------------------------------------------------------------------------

export function getDiscordAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;
  const redirectUri = process.env.DISCORD_REDIRECT_URI!;
  const scope = "identify";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
  const redirectUri = process.env.DISCORD_REDIRECT_URI!;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Discord user");
  }

  return res.json() as Promise<DiscordUser>;
}

// ---------------------------------------------------------------------------
// Avatar URL helpers
// ---------------------------------------------------------------------------

export function getAvatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  // Animated avatars use GIF; static ones use WebP for better quality.
  const ext = user.avatar.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
}

// ---------------------------------------------------------------------------
// Session cookie management (server-side)
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "eas_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function createSession(session: Session): Promise<void> {
  const cookieStore = await cookies();
  const value = Buffer.from(JSON.stringify(session)).toString("base64");
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    if (!cookie?.value) return null;

    const raw = Buffer.from(cookie.value, "base64").toString("utf-8");
    const session = JSON.parse(raw) as Session;

    // Check expiry
    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
