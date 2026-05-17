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
      <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-600/30 bg-gradient-to-r from-yellow-950/25 to-orange-950/15 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">💎</span>
          <p className="text-xs text-zinc-400 truncate">{message}</p>
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
    <div className="relative overflow-hidden rounded-2xl border border-yellow-600/30 bg-gradient-to-br from-yellow-950/25 via-orange-950/15 to-black p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-yellow-500/8 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💎</span>
            <h3 className="text-base font-black text-yellow-300">EAS Arena Premium</h3>
          </div>
          <p className="text-xs text-zinc-400 max-w-sm">{message}</p>
          <ul className="mt-2.5 space-y-1 text-xs text-zinc-500">
            <li>✨ Advanced stats &amp; analytics</li>
            <li>🎨 Custom cosmetics &amp; themes</li>
            <li>📊 Comparison history &amp; export</li>
          </ul>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-center">
            <p className="text-2xl font-black text-yellow-300">$4.99</p>
            <p className="text-[11px] text-zinc-600">per month</p>
          </div>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-900/25"
          >
            Upgrade to Premium
          </SoundLink>
        </div>
      </div>
    </div>
  );
}
