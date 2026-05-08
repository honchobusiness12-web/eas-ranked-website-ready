import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

const PERKS = [
  {
    icon: "📊",
    title: "Advanced Stats Dashboard",
    desc: "Deep-dive analytics: win/loss trends, KDA graphs, CR gain/loss breakdown, consistency metrics, and rank progression timeline.",
  },
  {
    icon: "🎨",
    title: "Custom Cosmetics",
    desc: "Personalise your profile with themes, rank badge styles, player titles, profile colours, and achievement frames.",
  },
  {
    icon: "⚔️",
    title: "Comparison History",
    desc: "Save your favourite player comparisons, view history, and compare multiple players at once.",
  },
  {
    icon: "🔍",
    title: "Custom Leaderboard Filters",
    desc: "Filter by rank tier, win rate, recent activity, and more. Save your custom filter presets.",
  },
  {
    icon: "📥",
    title: "Export Stats",
    desc: "Export your player stats as PDF, CSV, or image — complete with charts and graphs.",
  },
  {
    icon: "📜",
    title: "Full Match History",
    desc: "Detailed match-by-match breakdown with performance metrics and analytics.",
  },
  {
    icon: "🎯",
    title: "Personal Progress Tracker",
    desc: "Track your improvement over time, set goals, view milestones, and compare to previous seasons.",
  },
  {
    icon: "💎",
    title: "Premium Badge",
    desc: "Show off your premium status with a gold badge on your profile and leaderboard row.",
  },
];

const FAQ = [
  {
    q: "How does billing work?",
    a: "You are billed $4.99 every month via Lemonsqueezy. You can cancel at any time and retain access until the end of your billing period.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel from your subscription management page at any time. No questions asked.",
  },
  {
    q: "How do I link my Discord account?",
    a: "Premium is tied to your Discord user ID. Use the same Discord account you play with in EAS Arena.",
  },
  {
    q: "Is there a free trial?",
    a: "We don't currently offer a free trial, but you can cancel within the first month for a full refund if you're not satisfied.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit/debit cards and PayPal via Lemonsqueezy's secure checkout.",
  },
];

export default function SubscribePage() {
  const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || "#";

  return (
    <Shell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-yellow-600/40 bg-gradient-to-br from-yellow-950/40 via-orange-950/30 to-black p-10 text-center">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative">
          <span className="text-6xl">💎</span>
          <h1 className="mt-4 text-5xl font-black">
            <span
              style={{
                background: "linear-gradient(90deg, #FFD700, #FF9F43, #FF6B6B)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              EAS Arena Premium
            </span>
          </h1>
          <p className="mt-4 text-lg text-zinc-300 max-w-xl mx-auto">
            Unlock the full EAS Arena experience — advanced analytics, custom cosmetics, and exclusive features for serious players.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-yellow-300">$4.99</span>
              <span className="text-zinc-400">/ month</span>
            </div>
            <a
              href={checkoutUrl}
              className="mt-2 inline-block rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 px-10 py-4 text-lg font-black text-white shadow-xl shadow-yellow-900/30 hover:from-yellow-400 hover:to-orange-400 transition-all"
            >
              Subscribe Now →
            </a>
            <p className="text-xs text-zinc-500">Cancel anytime · Secure checkout via Lemonsqueezy</p>
          </div>
        </div>
      </section>

      {/* Perks grid */}
      <section className="mt-10">
        <h2 className="mb-6 text-3xl font-black text-center">Everything included</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-5 hover:border-yellow-600/50 transition"
            >
              <span className="text-3xl">{perk.icon}</span>
              <h3 className="mt-3 font-black text-yellow-200">{perk.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{perk.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mt-10 rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="grid grid-cols-3 border-b border-white/10 px-6 py-4 text-sm font-black uppercase tracking-wider text-zinc-500">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center text-yellow-300">💎 Premium</span>
        </div>
        {[
          ["Leaderboard access", true, true],
          ["Player profiles", true, true],
          ["Basic stats", true, true],
          ["Player comparison", true, true],
          ["Advanced analytics", false, true],
          ["Custom cosmetics", false, true],
          ["Comparison history", false, true],
          ["Custom filters", false, true],
          ["Export stats", false, true],
          ["Full match history", false, true],
          ["Progress tracker", false, true],
          ["Premium badge", false, true],
        ].map(([feature, free, premium]) => (
          <div
            key={String(feature)}
            className="grid grid-cols-3 border-b border-white/5 px-6 py-3 text-sm hover:bg-white/5 transition"
          >
            <span className="text-zinc-300">{String(feature)}</span>
            <span className="text-center">{free ? "✅" : "❌"}</span>
            <span className="text-center">{premium ? "✅" : "❌"}</span>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border border-yellow-600/40 bg-gradient-to-r from-yellow-950/30 to-orange-950/20 p-8 text-center">
        <h2 className="text-3xl font-black text-yellow-300">Ready to level up?</h2>
        <p className="mt-2 text-zinc-400">Join premium members and unlock the full EAS Arena experience.</p>
        <a
          href={checkoutUrl}
          className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 px-10 py-4 text-lg font-black text-white shadow-xl shadow-yellow-900/30 hover:from-yellow-400 hover:to-orange-400 transition-all"
        >
          Get Premium — $4.99/mo
        </a>
        <p className="mt-3 text-xs text-zinc-500">30-day money-back guarantee · Cancel anytime</p>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="mb-6 text-3xl font-black">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
              <h3 className="font-black text-yellow-200">{item.q}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Manage link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-zinc-500">
          Already a member?{" "}
          <SoundLink href="/premium/manage" soundType="click" className="text-yellow-400 hover:text-yellow-300 font-bold transition">
            Manage your subscription →
          </SoundLink>
        </p>
      </div>
    </Shell>
  );
}
