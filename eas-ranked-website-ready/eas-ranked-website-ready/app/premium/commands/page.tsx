import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumCommandsList from "@/components/PremiumCommandsList";
import { PREMIUM_COMMANDS } from "@/lib/premium-constants";

export const metadata = {
  title: "Premium Commands — EAS Arena",
  description:
    "Full list of EAS Arena Premium features: advanced stats, custom cosmetics, comparison history, export, match history, progress tracker, and more.",
};

export default function PremiumCommandsPage() {
  const availableCount = PREMIUM_COMMANDS.filter(
    (c) => c.status === "available"
  ).length;

  return (
    <Shell>
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">📋 Premium Commands</h1>
          <p className="mt-2 text-zinc-400">
            Everything included with your EAS Arena Premium membership.
          </p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* Stats bar */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black px-6 py-4">
          <p className="text-xs text-zinc-400">Total Features</p>
          <p className="mt-1 text-3xl font-black text-yellow-300">
            {PREMIUM_COMMANDS.length}
          </p>
        </div>
        <div className="rounded-2xl border border-green-700/30 bg-gradient-to-br from-green-950/20 to-black px-6 py-4">
          <p className="text-xs text-zinc-400">Available Now</p>
          <p className="mt-1 text-3xl font-black text-green-400">
            {availableCount}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] px-6 py-4">
          <p className="text-xs text-zinc-400">Price</p>
          <p className="mt-1 text-3xl font-black text-white">
            $4.99<span className="text-base font-bold text-zinc-400">/mo</span>
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <section>
        <h2 className="mb-5 text-2xl font-black">All Premium Features</h2>
        <PremiumCommandsList />
      </section>

      {/* Content creator note */}
      <section className="mt-10 rounded-2xl border border-blue-700/30 bg-gradient-to-br from-blue-950/20 to-black p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="text-3xl">🎙️</span>
          <div className="flex-1">
            <h3 className="font-black text-blue-200">Content Creator Access</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Discord users with the{" "}
              <span className="font-bold text-blue-300">Active Developer</span>{" "}
              or{" "}
              <span className="font-bold text-blue-300">
                Verified Bot Developer
              </span>{" "}
              badge receive automatic Premium access — no subscription required.
              Access is detected automatically when you look up your Discord
              User ID on any Premium feature page.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-8 rounded-2xl border border-yellow-600/40 bg-gradient-to-r from-yellow-950/30 to-orange-950/20 p-8 text-center">
        <h2 className="text-2xl font-black text-yellow-300">
          Ready to unlock everything?
        </h2>
        <p className="mt-2 text-zinc-400">
          Join Premium and get instant access to all{" "}
          {availableCount} features above.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="inline-block rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 px-10 py-4 text-lg font-black text-white shadow-xl shadow-yellow-900/30 hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            Get Premium — $4.99/mo
          </SoundLink>
          <SoundLink
            href="/premium/manage"
            soundType="click"
            className="inline-block rounded-2xl border border-yellow-600/50 px-8 py-4 text-sm font-bold text-yellow-300 hover:bg-yellow-950/30 transition"
          >
            Manage Subscription →
          </SoundLink>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Cancel anytime · Secure checkout via Lemonsqueezy
        </p>
      </section>
    </Shell>
  );
}
