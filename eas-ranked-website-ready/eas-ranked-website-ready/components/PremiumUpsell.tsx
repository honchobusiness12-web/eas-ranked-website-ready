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
      <div className="flex items-center justify-between gap-4 rounded-xl border border-yellow-600/40 bg-gradient-to-r from-yellow-950/30 to-orange-950/20 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">💎</span>
          <p className="text-sm text-zinc-300 truncate">{message}</p>
        </div>
        <SoundLink
          href="/premium/subscribe"
          soundType="success"
          className="shrink-0 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-1.5 text-xs font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
        >
          Upgrade →
        </SoundLink>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-yellow-600/40 bg-gradient-to-br from-yellow-950/30 via-orange-950/20 to-black p-6">
      {/* Glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💎</span>
            <h3 className="text-xl font-black text-yellow-300">EAS Arena Premium</h3>
          </div>
          <p className="text-sm text-zinc-300 max-w-md">{message}</p>
          <ul className="mt-3 space-y-1 text-xs text-zinc-400">
            <li>✨ Advanced stats &amp; analytics</li>
            <li>🎨 Custom cosmetics &amp; themes</li>
            <li>📊 Player comparison history</li>
            <li>🔍 Custom leaderboard filters</li>
            <li>📥 Export stats as PDF/CSV</li>
          </ul>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-center">
            <p className="text-3xl font-black text-yellow-300">$4.99</p>
            <p className="text-xs text-zinc-500">per month</p>
          </div>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-900/30"
          >
            Upgrade to Premium
          </SoundLink>
        </div>
      </div>
    </div>
  );
}
