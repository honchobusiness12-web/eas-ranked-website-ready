import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

export const revalidate = false;

export default function GuidePage() {
  return (
    <Shell>
      {/* Hero */}
      <section className="rounded-3xl border border-purple-800/40 bg-gradient-to-r from-black via-[#10051d] to-purple-950 p-8 shadow-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-purple-300">
          EAS Arena
        </p>
        <h1 className="text-4xl font-black md:text-5xl">📖 How Ranked Works</h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          Everything you need to know about the EAS competitive ranking system — from your first placement match to Hall of Fame.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SoundLink href="/ranks" soundType="success" className="rounded-xl border border-purple-700/60 bg-purple-950/30 px-4 py-2 text-sm font-bold text-purple-300 hover:bg-purple-950 transition">
            🏷️ View All Ranks
          </SoundLink>
          <SoundLink href="/placements" soundType="success" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 transition">
            📋 Placements Tracker
          </SoundLink>
          <SoundLink href="/leaderboard" soundType="success" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 transition">
            🏆 Leaderboard
          </SoundLink>
        </div>
      </section>

      {/* Quick reference cards */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { emoji: "🎯", label: "Placement Matches", value: "7", sub: "to earn your rank" },
          { emoji: "📈", label: "Starting CR",       value: "0", sub: "after placements" },
          { emoji: "🏷️", label: "Total Tiers",       value: "30", sub: "across 10 divisions" },
          { emoji: "🔝", label: "Max CR",            value: "5,300+", sub: "Hall of Fame High" },
        ].map(({ emoji, label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 text-center">
            <span className="text-2xl">{emoji}</span>
            <p className="mt-2 text-2xl font-black text-purple-300">{value}</p>
            <p className="mt-0.5 text-xs font-bold text-white">{label}</p>
            <p className="text-xs text-zinc-500">{sub}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 space-y-6">

        {/* Section 1 — What is Ranked */}
        <GuideSection
          emoji="🏆"
          title="What is Ranked Mode?"
          color="purple"
        >
          <p className="text-zinc-300 leading-relaxed">
            Ranked mode is EAS Arena's competitive ladder — a structured system where every match you play directly impacts your standing in the league. Unlike casual play, ranked matches carry real stakes: wins push you up the ladder, losses pull you down, and your final position at the end of a season reflects your true skill level.
          </p>
          <p className="mt-3 text-zinc-300 leading-relaxed">
            The ranked system uses <strong className="text-white">Competitive Rating (CR)</strong> as its core metric. Every player starts at 0 CR after completing placements, and your CR rises or falls based on match outcomes, opponent strength, and performance. Your CR determines your rank tier, which ranges from <strong className="text-white">R1 Rookie</strong> all the way up to <strong className="text-white">R10 Hall of Fame</strong>.
          </p>
        </GuideSection>

        {/* Section 2 — How Ranked Works */}
        <GuideSection
          emoji="🎮"
          title="How Ranked Works"
          color="blue"
        >
          <p className="text-zinc-300 leading-relaxed">
            The ranked system is split into two distinct phases — <strong className="text-white">Placements</strong> and <strong className="text-white">Ranked</strong>. Understanding how each phase works will help you make the most of every match you play.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Placements Phase card */}
            <div className="rounded-xl border border-blue-700/30 bg-blue-950/20 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-blue-300">
                <span>📋</span> Placements Phase
              </p>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                All players begin in placements with <strong className="text-white">0 CR</strong>. This phase is designed to quickly evaluate skill and determine a fair starting rank.
              </p>
              <ul className="mt-3 space-y-1.5">
                {[
                  { icon: "✅", text: "Winning matches grants high CR" },
                  { icon: "🔼", text: "Losing still grants a small amount of CR" },
                  { icon: "💪", text: "Strong performance and consistency improve results" },
                  { icon: "🎯", text: "Focuses on measuring skill, not punishing losses" },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="mt-0.5 shrink-0">{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ranked Phase card */}
            <div className="rounded-xl border border-purple-700/30 bg-purple-950/20 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-purple-300">
                <span>🏆</span> Ranked Phase
              </p>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                After completing placements, players enter the full ranked system where every result has real consequences.
              </p>
              <ul className="mt-3 space-y-1.5">
                {[
                  { icon: "📈", text: "Winning increases CR based on performance and match difficulty" },
                  { icon: "📉", text: "Losing decreases CR, with harsher penalties at higher ranks" },
                  { icon: "⚔️", text: "Playing against stronger opponents grants higher rewards" },
                  { icon: "🔝", text: "Climbing becomes more challenging as rank increases" },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="mt-0.5 shrink-0">{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Philosophy callout */}
          <div className="mt-4 rounded-xl border border-blue-700/30 bg-blue-950/20 px-4 py-3">
            <p className="text-sm font-bold text-blue-300">🌟 Overall Philosophy</p>
            <p className="mt-1 text-sm text-zinc-400">
              The system is designed to reward <strong className="text-white">consistency</strong>, <strong className="text-white">performance</strong>, and <strong className="text-white">competitive play</strong> while maintaining a fair and balanced ranking environment.
            </p>
          </div>
        </GuideSection>

        {/* Section 3 — CR explained */}
        <GuideSection
          emoji="📊"
          title="Competitive Rating (CR) Explained"
          color="blue"
        >
          <p className="text-zinc-300 leading-relaxed">
            CR is the number that defines your rank. It goes up when you win and down when you lose. The amount of CR you gain or lose per match is not fixed — it scales based on several factors:
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: "✅",
                title: "Win",
                desc: "You gain CR. The exact amount depends on the strength of the team you beat — defeating higher-ranked opponents earns more.",
              },
              {
                icon: "❌",
                title: "Loss",
                desc: "You lose CR. Losing to a lower-ranked team costs more CR than losing to a stronger one.",
              },
              {
                icon: "⚔️",
                title: "Opponent Strength",
                desc: "Beating a team ranked significantly above you yields a larger CR reward. The system rewards upsets.",
              },
              {
                icon: "🛡️",
                title: "Rank Protection",
                desc: "At certain thresholds, you may have demotion protection — preventing you from dropping below a tier boundary on a single loss.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#0d0d14] p-4">
                <p className="flex items-center gap-2 font-bold text-white">
                  <span>{icon}</span> {title}
                </p>
                <p className="mt-1 text-sm text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-blue-700/30 bg-blue-950/20 px-4 py-3">
            <p className="text-sm font-bold text-blue-300">💡 Example</p>
            <p className="mt-1 text-sm text-zinc-400">
              A team at 800 CR (R3 Pro Mid) beats a team at 1200 CR (R5 All-Star Low). Because they defeated a much stronger opponent, they might earn <strong className="text-white">+35 CR</strong> instead of the standard +20. The stronger team loses less CR because losing to a lower-ranked opponent is expected to happen occasionally.
            </p>
          </div>
        </GuideSection>

        {/* Section 3 — Placements */}
        <GuideSection
          emoji="📋"
          title="Placement Matches"
          color="yellow"
        >
          <p className="text-zinc-300 leading-relaxed">
            Before you receive an official rank, you must complete <strong className="text-white">7 placement matches</strong>. These matches determine your starting position on the ranked ladder. During placements, your performance is evaluated and you are placed into the rank tier that best reflects your skill level.
          </p>
          <div className="mt-5">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-500">Placement Progress</p>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((match) => (
                <div key={match} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-zinc-500">Match {match}</span>
                  <div className="flex-1 rounded-full bg-zinc-800 h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
                      style={{ width: `${(match / 7) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-zinc-500">
                    {Math.round((match / 7) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-yellow-700/30 bg-yellow-950/20 px-4 py-3">
            <p className="text-sm font-bold text-yellow-300">⚠️ Important</p>
            <p className="mt-1 text-sm text-zinc-400">
              You must be <strong className="text-white">registered</strong> in the system before you can begin placement matches. Contact a league admin to get registered. Once registered, your placement progress is tracked automatically.
            </p>
          </div>
        </GuideSection>

        {/* Section 4 — Rank tiers */}
        <GuideSection
          emoji="🏷️"
          title="Rank Tiers & Progression"
          color="purple"
        >
          <p className="text-zinc-300 leading-relaxed">
            The EAS ranked ladder has <strong className="text-white">10 major divisions</strong>, each split into three sub-tiers: <strong className="text-white">Low</strong>, <strong className="text-white">Mid</strong>, and <strong className="text-white">High</strong>. That gives a total of <strong className="text-white">30 distinct rank tiers</strong> to climb through.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { tier: "R1", name: "Rookie",      range: "0 – 399",    emoji: "🌱", color: "text-zinc-300" },
              { tier: "R2", name: "Amateur",     range: "400 – 699",  emoji: "🥉", color: "text-amber-600" },
              { tier: "R3", name: "Pro",         range: "700 – 999",  emoji: "⚙️", color: "text-sky-400" },
              { tier: "R4", name: "Elite",       range: "1,000 – 1,199", emoji: "💎", color: "text-cyan-300" },
              { tier: "R5", name: "All-Star",    range: "1,200 – 1,599", emoji: "⭐", color: "text-yellow-300" },
              { tier: "R6", name: "SuperStar",   range: "1,600 – 2,099", emoji: "🌟", color: "text-orange-300" },
              { tier: "R7", name: "Remorseless", range: "2,100 – 2,749", emoji: "🔥", color: "text-red-400" },
              { tier: "R8", name: "Legend",      range: "2,750 – 3,549", emoji: "👑", color: "text-purple-300" },
              { tier: "R9", name: "Unreal",      range: "3,550 – 4,499", emoji: "🌌", color: "text-violet-300" },
              { tier: "R10", name: "Hall of Fame", range: "4,500+",   emoji: "🏛️", color: "text-amber-300" },
            ].map(({ tier, name, range, emoji, color }) => (
              <div key={tier} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3">
                <span className="text-xl">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${color}`}>{tier} · {name}</p>
                  <p className="text-xs text-zinc-500">{range} CR</p>
                </div>
                <div className="flex gap-1">
                  {["Low", "Mid", "High"].map((sub) => (
                    <span key={sub} className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-white/5 text-zinc-500">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <SoundLink
              href="/ranks"
              soundType="success"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-700/60 bg-purple-950/30 px-4 py-2 text-sm font-bold text-purple-300 hover:bg-purple-950 transition"
            >
              🏷️ See Full Rank Details →
            </SoundLink>
          </div>
        </GuideSection>

        {/* Section 5 — Difficulty scaling */}
        <GuideSection
          emoji="⚖️"
          title="Difficulty-Based CR Scaling"
          color="green"
        >
          <p className="text-zinc-300 leading-relaxed">
            Not all wins are worth the same. The EAS ranked system uses <strong className="text-white">difficulty-based scaling</strong> to reward players who punch above their weight. When you beat a team that is ranked significantly higher than you, you earn more CR. When you lose to a much weaker team, you lose more CR.
          </p>
          <div className="mt-5 space-y-3">
            {[
              {
                scenario: "You beat a team 300+ CR above you",
                result: "Large CR gain",
                icon: "🚀",
                color: "border-green-700/40 bg-green-950/20",
                resultColor: "text-green-400",
              },
              {
                scenario: "You beat a team at similar CR",
                result: "Standard CR gain",
                icon: "✅",
                color: "border-white/10 bg-[#0d0d14]",
                resultColor: "text-white",
              },
              {
                scenario: "You beat a team 300+ CR below you",
                result: "Small CR gain",
                icon: "📉",
                color: "border-yellow-700/30 bg-yellow-950/10",
                resultColor: "text-yellow-400",
              },
              {
                scenario: "You lose to a team 300+ CR above you",
                result: "Small CR loss",
                icon: "🛡️",
                color: "border-blue-700/30 bg-blue-950/10",
                resultColor: "text-blue-400",
              },
              {
                scenario: "You lose to a team at similar CR",
                result: "Standard CR loss",
                icon: "❌",
                color: "border-white/10 bg-[#0d0d14]",
                resultColor: "text-zinc-300",
              },
              {
                scenario: "You lose to a team 300+ CR below you",
                result: "Large CR loss",
                icon: "💥",
                color: "border-red-700/40 bg-red-950/20",
                resultColor: "text-red-400",
              },
            ].map(({ scenario, result, icon, color, resultColor }) => (
              <div key={scenario} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${color}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <p className="text-sm text-zinc-300">{scenario}</p>
                </div>
                <p className={`shrink-0 text-sm font-black ${resultColor}`}>{result}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-green-700/30 bg-green-950/20 px-4 py-3">
            <p className="text-sm font-bold text-green-300">🎯 Why this matters</p>
            <p className="mt-1 text-sm text-zinc-400">
              This system ensures that players are always incentivised to compete at the highest level possible. Farming easy wins against weaker opponents yields diminishing returns, while taking on stronger competition is always rewarded.
            </p>
          </div>
        </GuideSection>

        {/* Section 6 — Tips for climbing */}
        <GuideSection
          emoji="📈"
          title="Tips for Climbing the Ladder"
          color="purple"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                icon: "🧠",
                title: "Play consistently",
                desc: "Regular play keeps you sharp. Long breaks can lead to rust — try to play at least a few matches per week during the season.",
              },
              {
                icon: "🤝",
                title: "Communicate with your team",
                desc: "Ranked is a team game. Clear communication before and during matches dramatically improves win rates at every level.",
              },
              {
                icon: "🎯",
                title: "Focus on your role",
                desc: "Know what your team needs from you and execute it well. Trying to do everything often means doing nothing effectively.",
              },
              {
                icon: "📹",
                title: "Review your matches",
                desc: "After a loss, think about what went wrong. One actionable takeaway per match compounds into massive improvement over time.",
              },
              {
                icon: "😤",
                title: "Manage tilt",
                desc: "Losing streaks happen to everyone. Take a break if you're frustrated — playing on tilt leads to more losses and more CR lost.",
              },
              {
                icon: "⚔️",
                title: "Challenge stronger opponents",
                desc: "Don't shy away from tougher matchups. The CR scaling system rewards you generously for beating higher-ranked teams.",
              },
              {
                icon: "📊",
                title: "Track your progress",
                desc: "Use the leaderboard and player profiles to monitor your CR trend over time. Seeing improvement is a powerful motivator.",
              },
              {
                icon: "🏆",
                title: "Set milestone goals",
                desc: "Rather than fixating on the top, aim for the next sub-tier. Small, achievable goals keep you motivated and moving forward.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#0d0d14] p-4">
                <p className="flex items-center gap-2 font-bold text-white">
                  <span className="text-lg">{icon}</span> {title}
                </p>
                <p className="mt-1 text-sm text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </GuideSection>

        {/* Section 7 — Season info */}
        <GuideSection
          emoji="📅"
          title="Season Information"
          color="orange"
        >
          <div className="rounded-2xl border border-orange-700/40 bg-orange-950/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-black">Season One</p>
                <p className="mt-0.5 text-sm text-zinc-400">2026 Season</p>
              </div>
              <span className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-black tracking-wider text-white">
                OFF SEASON
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-orange-700/30 bg-orange-950/30 px-4 py-3">
              <p className="text-sm font-bold text-orange-300">⏸ Season Paused</p>
              <p className="mt-1 text-sm text-zinc-400">
                The ranked season is currently on break. All CR and rank data is preserved. Stay tuned for the next season start date.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">How Seasons Work</p>
            {[
              {
                icon: "🚀",
                title: "Season Start",
                desc: "At the beginning of each season, all players undergo a soft reset. Your CR is adjusted toward the median, giving everyone a fresh opportunity to climb.",
              },
              {
                icon: "⚔️",
                title: "Active Season",
                desc: "During an active season, every ranked match counts. CR fluctuates in real time as results are reported. The leaderboard updates live.",
              },
              {
                icon: "🏁",
                title: "Season End",
                desc: "When a season concludes, final standings are locked. Top players receive recognition and rewards based on their peak rank achieved.",
              },
              {
                icon: "🔄",
                title: "Off Season",
                desc: "Between seasons, ranked matches are paused. Use this time to review your performance, practice, and prepare for the next season.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3">
                <span className="mt-0.5 text-lg">{icon}</span>
                <div>
                  <p className="font-bold text-sm text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-zinc-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GuideSection>

      </div>

      {/* Footer CTA */}
      <div className="mt-10 rounded-2xl border border-purple-700/40 bg-purple-950/20 p-8 text-center">
        <p className="text-2xl font-black">Ready to compete?</p>
        <p className="mt-2 text-zinc-400 max-w-lg mx-auto">
          Check the leaderboard to see where you stand, view all rank tiers, or track players currently in placements.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <SoundLink href="/leaderboard" soundType="success" className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold hover:bg-purple-500 transition">
            🏆 Leaderboard
          </SoundLink>
          <SoundLink href="/ranks" soundType="success" className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold hover:bg-white/10 transition">
            🏷️ Rank Guide
          </SoundLink>
          <SoundLink href="/placements" soundType="success" className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold hover:bg-white/10 transition">
            📋 Placements
          </SoundLink>
        </div>
      </div>
    </Shell>
  );
}

// ─── Reusable section wrapper ────────────────────────────────────────────────

function GuideSection({
  emoji,
  title,
  color,
  children,
}: {
  emoji: string;
  title: string;
  color: "purple" | "blue" | "yellow" | "green" | "orange";
  children: React.ReactNode;
}) {
  const borderColors = {
    purple: "border-purple-700/40",
    blue:   "border-blue-700/40",
    yellow: "border-yellow-600/40",
    green:  "border-green-700/40",
    orange: "border-orange-700/40",
  };
  const bgColors = {
    purple: "bg-purple-950/10",
    blue:   "bg-blue-950/10",
    yellow: "bg-yellow-950/10",
    green:  "bg-green-950/10",
    orange: "bg-orange-950/10",
  };
  const headingColors = {
    purple: "text-purple-300",
    blue:   "text-blue-300",
    yellow: "text-yellow-300",
    green:  "text-green-300",
    orange: "text-orange-300",
  };

  return (
    <div className={`rounded-2xl border ${borderColors[color]} ${bgColors[color]} p-6`}>
      <h2 className={`flex items-center gap-2 text-xl font-black ${headingColors[color]}`}>
        <span>{emoji}</span> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
