import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/premium/cosmetics",
  "/premium/export",
  "/premium/matches",
  "/premium/tracker",
  "/premium/manage",
  "/premium/comparisons",
  "/premium/stats",
  "/redeem",
  "/admin/giveaways",
  "/admin/cr",
  "/admin/announcements",
  "/admin/seasons",
  "/cosmetics/colors",
];

// Routes that are always public
const PUBLIC_ROUTES = [
  "/",
  "/leaderboard",
  "/players",
  "/compare",
  "/placements",
  "/ranks",
  "/guide",
  "/auth/login",
  "/auth/callback",
  "/premium/subscribe",
  "/premium/commands",
  "/giveaway/redeem",
];

const SESSION_COOKIE = "eas_session";

function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) return false;

  try {
    const raw = Buffer.from(cookie.value, "base64").toString("utf-8");
    const session = JSON.parse(raw);
    return session && Date.now() < session.expiresAt;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if this is a protected route
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !isAuthenticated(req)) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - API routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
