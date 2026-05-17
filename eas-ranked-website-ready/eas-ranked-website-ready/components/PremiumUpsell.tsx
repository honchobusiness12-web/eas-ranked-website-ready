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
      <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-600/20 bg-yellow-950/10 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">💎</span>
          <p className="text-xs text-zinc-400 truncate">{message}</p>
        </div>
        <SoundLink
          href="/premium/subscribe"
          soundType="success"
          className="shrink-0 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          Upgrade →
        </SoundLink>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-yellow-600/20 bg-yellow-950/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💎</span>
            <h3 className="text-base font-black text-yellow-300">EAS Arena Premium</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-md">{message}</p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-500">
            <span>✨ Advanced stats &amp; analytics</span>
            <span>🎨 Custom cosmetics &amp; themes</span>
            <span>📊 Comparison history</span>
            <span>🔍 Custom leaderboard filters</span>
            <span>📥 Export stats as PDF/CSV</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="text-center">
            <p className="text-2xl font-black text-yellow-300">$4.99</p>
            <p className="text-xs text-zinc-600">per month</p>
          </div>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Upgrade to Premium
          </SoundLink>
        </div>
      </div>
    </div>
  );
}
