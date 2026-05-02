import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import { ranks } from "@/lib/ranks";

export const revalidate = 30;

const tierMeta: Record<string, { emoji: string; color: string; border: string; bg: string; description: string; tip: string }> = {
  R1: {
    emoji: "🌱",
    color: "text-zinc-300",
    border: "border-zinc-600/40",
    bg: "bg-zinc-800/20",
    description: "The starting point for all new ranked players. Focus on learning the fundamentals — positioning, communication, and consistent play.",
    tip: "Play every match to completion. Early CR gains are generous — don't forfeit.",
  },
  R2: {
    emoji: "🥉",
    color: "text-amber-600",
    border: "border-amber-700/40",
    bg: "bg-amber-950/20",
    description: "You've got the basics down. Amateur players are developing their individual skills and starting to understand team dynamics.",
    tip: "Focus on reducing mistakes rather than making flashy plays. Consistency beats highlight reels here.",
  },
  R3: {
    emoji: "⚙️",
    color: "text-sky-400",
    border: "border-sky-700/40",
    bg: "bg-sky-950/20",
    description: "Pro players have solid mechanics and game sense. Competition gets noticeably tougher — every match matters.",
    tip: "Study your losses. Identify one thing you could have done differently each game.",
  },
  R4: {
    emoji: "💎",
    color: "text-cyan-300",
    border: "border-cyan-600/40",
    bg: "bg-cyan-950/20",
    description: "Elite is where the serious competitors live. Teamwork and strategy become as important as individual skill.",
    tip: "Coordinate with your team before matches. Agreed-upon roles and strategies win games at this level.",
  },
  R5: {
    emoji: "⭐",
    color: "text-yellow-300",
    border: "border-yellow-500/40",
    bg: "bg-yellow-950/20",
    description: "All-Star players are among the best in the league. Reaching this tier puts you in the top echelon of the competitive ladder.",
    tip: "Mental fortitude matters. Stay composed under pressure and don't tilt after losses.",
  },
  R6: {
    emoji: "🌟",
    color: "text-orange-300",
    border: "border-orange-500/40",
    bg: "bg-orange-950/20",
    description: "SuperStar is reserved for exceptional players who dominate consistently. You're competing against the league's finest.",
    tip: "Analyse opponents before matches. At this level, preparation and adaptability separate winners from losers.",
  },
  R7: {
    emoji: "🔥",
    color: "text-red-400",
    border: "border-red-600/40",
    bg: "bg-red-950/20",
    description: "Remorseless players show no mercy. Reaching this tier means you've proven yourself against the very best competition repeatedly.",
    tip: "Mentor newer players — teaching reinforces your own understanding and builds a stronger community.",
  },
  R8: {
    emoji: "👑",
    color: "text-purple-300",
    border: "border-purple-500/40",
    bg: "bg-purple-950/20",
    description: "Legend status. Only the most dedicated and skilled players reach this tier. Your name is known across the arena.",
    tip: "Consistency over long periods defines Legends. Maintain your standard every single match.",
  },
  R9: {
    emoji: "🌌",
    color: "text-violet-300",
    border: "border-violet-500/40",
    bg: "bg-violet-950/20",
    description: "Unreal is near the pinnacle of competitive play. Players here are considered among the greatest to ever compete in EAS.",
    tip: "At this level, the mental game is everything. Confidence, focus, and adaptability are your greatest weapons.",
  },
  R10: {
    emoji: "🏛️",
    color: "text-amber-300",
    border: "border-amber-400/40",
    bg: "bg-amber-950/20",
    description: "Hall of Fame is the highest honour in EAS ranked. These players have transcended competition and become legends of the game.",
    tip: "You've reached the top. Lead by example, inspire others, and defend your legacy.",
  },
};

// Group ranks by tier (R1–R10)
const tierGroups = ranks.reduce<Record<string, typeof ranks>>((acc, rank) => {
  const tier = rank.name.split(" ")[0]; // e.g. "R1"
  if (!acc[tier]) acc[tier] = [];
  acc[tier].push(rank);
  return acc;
}, {});

const tierOrder = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"];

export default function RanksPage() {
  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black">🏷️ Rank System</h1>
          <p className="mt-2 text-zinc-400">
            All 30 rank tiers across 10 divisions — from Rookie to Hall of Fame.
          </p>
        </div>
        <SoundLink
          href="/guide"
          soundType="success"
          className="inline-flex items-center gap-2 rounded-xl border border-purple-700/60 bg-purple-950/30 px-4 py-2 text-sm font-bold text-purple-300 hover:bg-purple-950 transition"
        >
          📖 How Ranked Works →
        </SoundLink>
      </div>

      {/* CR overview strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Starting CR",       value: "0",     note: "After placements" },
          { label: "Placement Matches", value: "7",     note: "Required to rank" },
          { label: "Rank Tiers",        value: "10",    note: "R1 → R10" },
          { label: "Sub-tiers",         value: "30",    note: "Low / Mid / High" },
          { label: "Max CR",            value: "5300+", note: "Hall of Fame High" },
        ].map(({ label, value, note }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-purple-300">{value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{note}</p>
          </div>
        ))}
      </div>

      {/* Tier groups */}
      <div className="mt-8 space-y-8">
        {tierOrder.map((tier) => {
          const meta = tierMeta[tier];
          const tierRanks = tierGroups[tier] ?? [];
          const tierName = tierRanks[0]?.name
            .replace(/^R\d+\s/, "")
            .replace(/\s(Low|Mid|High)$/, "") ?? tier;

          return (
            <div key={tier} className={`rounded-2xl border ${meta.border} ${meta.bg} p-6`}>
              {/* Tier header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{meta.emoji}</span>
                  <div>
                    <h2 className={`text-xl font-black ${meta.color}`}>
                      {tier} · {tierName}
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-400">{meta.description}</p>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-center">
                  <p className="text-xs text-zinc-500">CR Range</p>
                  <p className={`text-sm font-black ${meta.color}`}>
                    {tierRanks[0]?.min.toLocaleString()} – {tierRanks[tierRanks.length - 1]?.min.toLocaleString()}+
                  </p>
                </div>
              </div>

              {/* Sub-tier cards */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {tierRanks.map((rank) => {
                  const sub = rank.name.split(" ").pop() as "Low" | "Mid" | "High";
                  const subStyles: Record<string, string> = {
                    Low:  "text-zinc-400 border-zinc-700/40",
                    Mid:  `${meta.color} border-white/10`,
                    High: `${meta.color} border-white/20`,
                  };
                  return (
                    <div
                      key={rank.name}
                      className={`rounded-xl border bg-black/20 px-4 py-3 ${subStyles[sub] ?? ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{rank.name}</p>
                        <span className="text-xs text-zinc-500">{sub}</span>
                      </div>
                      <p className="mt-1 text-lg font-black">{rank.min.toLocaleString()} CR</p>
                    </div>
                  );
                })}
              </div>

              {/* Tip */}
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <span className="mt-0.5 text-sm">💡</span>
                <p className="text-xs text-zinc-400">{meta.tip}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-10 rounded-2xl border border-purple-700/40 bg-purple-950/20 p-6 text-center">
        <p className="text-lg font-black">Ready to climb?</p>
        <p className="mt-1 text-sm text-zinc-400">
          Complete your 7 placement matches to earn your starting rank, then grind your way to Hall of Fame.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <SoundLink href="/leaderboard" soundType="success" className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold hover:bg-purple-500 transition">
            🏆 View Leaderboard
          </SoundLink>
          <SoundLink href="/guide" soundType="success" className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold hover:bg-white/10 transition">
            📖 How Ranked Works
          </SoundLink>
        </div>
      </div>
    </Shell>
  );
}
