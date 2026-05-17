import SoundLink from "@/components/SoundLink";

interface PremiumUpsellProps {
  message?: string;
  compact?: boolean;
}

/**
 * Reusable upsell banner shown to non-premium users throughout the site.
 */
export default function PremiumUpsell({
  message = "Upgrade to Premium to unlock advanced stats, cosmetics, and exclusive features.",
  compact = false,
}: PremiumUpsellProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.06] px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:border-yellow-400/25">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-500/15 text-sm">💎</div>
          <p className="text-xs text-zinc-400 truncate">{message}</p>
        </div>
        <SoundLink
          href="/premium/subscribe"
          soundType="success"
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_4px_16px_rgba(255,159,67,0.4)]"
          style={{ background: "linear-gradient(135deg, #FFD700, #FF9F43)" }}
        >
          Upgrade →
        </SoundLink>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-yellow-500/15 p-6 backdrop-blur-sm" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(255,159,67,0.04) 50%, rgba(168,85,247,0.05) 100%), rgba(11,11,31,0.9)" }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-15 blur-3xl" style={{ background: "radial-gradient(circle, #FFD700, transparent)" }} />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full opacity-10 blur-2xl" style={{ background: "radial-gradient(circle, #A855F7, transparent)" }} />

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,159,67,0.15))", border: "1px solid rgba(255,215,0,0.2)" }}>
              💎
            </div>
            <div>
              <h3 className="text-base font-black gold-text-gradient">EAS Arena Premium</h3>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Unlock the full experience</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed">{message}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-zinc-500">
            {[
              "✨ Advanced stats & analytics",
              "🎨 Custom cosmetics & themes",
              "📊 Comparison history",
              "🔍 Custom leaderboard filters",
              "📥 Export stats as PDF/CSV",
              "🎯 Progress tracker",
            ].map((feat) => (
              <span key={feat} className="flex items-center gap-1.5">{feat}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-3xl font-black gold-text-gradient" style={{ letterSpacing: "-0.03em" }}>$4.99</p>
            <p className="text-xs text-zinc-600 font-medium">per month</p>
          </div>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_8px_28px_rgba(255,159,67,0.5)] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #FFD700, #FF9F43, #FF6B6B)" }}
          >
            ✨ Upgrade to Premium
          </SoundLink>
          <p className="text-[10px] text-zinc-700">Cancel anytime · Instant access</p>
        </div>
      </div>
    </div>
  );
}
