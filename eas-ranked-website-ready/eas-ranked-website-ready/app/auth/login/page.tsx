import Shell from "@/components/ServerShell";
import { getDiscordAuthUrl } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const authUrl = getDiscordAuthUrl();

  const errorMessages: Record<string, string> = {
    access_denied: "You cancelled the Discord login. Please try again.",
    oauth_failed: "Something went wrong during login. Please try again.",
  };

  const errorMsg = error ? errorMessages[error] : null;

  return (
    <Shell>
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md rounded-3xl p-10 text-center"
          style={{ background: "rgba(6,43,69,0.85)", border: "1px solid rgba(0,207,255,0.22)", boxShadow: "0 24px 80px rgba(0,0,0,0.40), 0 0 0 1px rgba(0,207,255,0.10) inset", backdropFilter: "blur(24px)" }}>
          {/* Logo */}
          <div className="mb-6 text-6xl">🌊</div>
          <h1 className="text-3xl font-black" style={{ color: "#e0f7ff" }}>
            EAS <span className="summer-text-gradient">ARENA</span>
          </h1>
          <p className="mt-2" style={{ color: "rgba(168,255,246,0.65)" }}>Sign in to access your profile and stats</p>

          {/* Error */}
          {errorMsg && (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid rgba(255,127,80,0.35)", background: "rgba(255,127,80,0.10)", color: "#FF7F50" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Login button */}
          <a
            href={authUrl}
            className="mt-8 flex items-center justify-center gap-3 rounded-xl px-6 py-4 text-base font-bold text-white transition hover:opacity-90 active:scale-95"
            style={{ background: "#5865F2", boxShadow: "0 4px 20px rgba(88,101,242,0.40)" }}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Login with Discord
          </a>

          {/* Info */}
          <div className="mt-8 space-y-3 rounded-2xl p-5 text-left text-sm" style={{ border: "1px solid rgba(0,207,255,0.18)", background: "rgba(0,207,255,0.06)", color: "rgba(168,255,246,0.65)" }}>
            <p className="font-bold" style={{ color: "#e0f7ff" }}>🔒 What we collect</p>
            <p>• Your Discord user ID, username, and avatar</p>
            <p>• We do <span className="font-semibold" style={{ color: "#e0f7ff" }}>not</span> collect your email or messages</p>
            <p>• Your session is stored in a secure cookie and expires in 7 days</p>
            <p>• You can log out at any time</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
