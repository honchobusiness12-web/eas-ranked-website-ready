import Shell from "@/components/ServerShell";
import SoundLink from "@/components/SoundLink";

export default function GiveawayRedeemInfoPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-6xl">🎁</span>
          <h1 className="mt-4 text-4xl font-black">Giveaway Code Redemption</h1>
          <p className="mt-2 text-zinc-400">
            Everything you need to know about finding and redeeming EAS Ranked giveaway codes.
          </p>
        </div>

        {/* Redeem CTA */}
        <div className="rounded-2xl border border-purple-700/40 bg-purple-950/20 p-6 mb-8 text-center">
          <p className="text-xl font-black text-purple-300 mb-2">Have a code already?</p>
          <p className="text-sm text-zinc-400 mb-5">
            Head straight to the redemption page to activate your reward.
          </p>
          <SoundLink
            href="/redeem"
            soundType="success"
            className="inline-block rounded-xl px-8 py-3 font-black text-white transition-all shadow-lg"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
          >
            🎁 Redeem Your Code →
          </SoundLink>
        </div>

        {/* Where to find codes */}
        <section className="mb-8">
          <h2 className="text-2xl font-black mb-4">📍 Where to Find Codes</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-blue-700/30 bg-blue-950/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">💬</span>
                <h3 className="text-lg font-black">Discord Server</h3>
              </div>
              <p className="text-sm text-zinc-400">
                Join the official EAS Ranked Discord server. Codes are posted in the{" "}
                <span className="text-blue-300 font-bold">#giveaways</span> and{" "}
                <span className="text-blue-300 font-bold">#announcements</span> channels.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-700/30 bg-orange-950/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📢</span>
                <h3 className="text-lg font-black">Dashboard Announcements</h3>
              </div>
              <p className="text-sm text-zinc-400">
                Keep an eye on the EAS Ranked dashboard homepage. Announcements sometimes
                include exclusive giveaway codes.
              </p>
            </div>

            <div className="rounded-2xl border border-purple-700/30 bg-purple-950/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏆</span>
                <h3 className="text-lg font-black">Tournaments & Events</h3>
              </div>
              <p className="text-sm text-zinc-400">
                Participate in EAS Ranked tournaments and community events. Winners and top performers
                often receive codes as prizes.
              </p>
            </div>

            <div className="rounded-2xl border border-green-700/30 bg-green-950/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🎮</span>
                <h3 className="text-lg font-black">Community Milestones</h3>
              </div>
              <p className="text-sm text-zinc-400">
                When the community hits milestones (player count, match count, etc.), codes are
                distributed to celebrate the achievement.
              </p>
            </div>
          </div>
        </section>

        {/* Step-by-step guide */}
        <section className="mb-8">
          <h2 className="text-2xl font-black mb-4">📋 How to Redeem — Step by Step</h2>
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            {[
              {
                step: 1,
                icon: "🔑",
                title: "Log in with Discord",
                desc: "You must be logged in to your Discord account on EAS Ranked. Click the Login button in the top-right corner if you haven't already.",
              },
              {
                step: 2,
                icon: "🎁",
                title: "Go to the Redeem page",
                desc: "Navigate to the Redeem Code page using the sidebar link or the button above.",
              },
              {
                step: 3,
                icon: "⌨️",
                title: "Enter your code",
                desc: "Type or paste your giveaway code into the input field. Codes are case-insensitive and usually look like EAS-XXXXXX.",
              },
              {
                step: 4,
                icon: "✅",
                title: "Click Redeem",
                desc: "Hit the Redeem Code button. If the code is valid, your reward will be activated immediately.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex gap-4 border-b border-white/5 last:border-0 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-white text-sm" style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}>
                  {step}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{icon}</span>
                    <p className="font-black">{title}</p>
                  </div>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="text-2xl font-black mb-4">❓ Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "Can I use a code more than once?",
                a: "No. Each code can only be redeemed once per account. If you try to redeem the same code again, you'll see an 'already redeemed' error.",
              },
              {
                q: "Do codes expire?",
                a: "Some codes have an expiration date — after that date, the code can no longer be redeemed even if it hasn't been used. Check the announcement where you found the code for expiry details.",
              },
              {
                q: "What if my code says 'invalid'?",
                a: "Double-check that you've entered the code correctly. Codes are case-insensitive, but make sure there are no extra spaces. If the problem persists, the code may have expired or reached its maximum uses.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-sm hover:bg-white/5 transition list-none">
                  <span>{q}</span>
                  <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="border-t border-white/5 px-5 py-4">
                  <p className="text-sm text-zinc-400">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Footer links */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 text-center">
          <p className="font-black mb-4">Looking for more?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="rounded-xl px-6 py-2.5 font-black text-white transition-all"
              style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
            >
              🏆 View Leaderboard
            </SoundLink>
            <SoundLink
              href="/guide"
              soundType="click"
              className="rounded-xl border border-white/10 px-6 py-2.5 font-bold text-zinc-300 hover:bg-white/5 transition"
            >
              📖 How Ranked Works
            </SoundLink>
          </div>
        </div>
      </div>
    </Shell>
  );
}
