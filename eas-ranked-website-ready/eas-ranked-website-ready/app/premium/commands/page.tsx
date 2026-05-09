import Shell from "@/components/ServerShell";
import SoundLink from "@/components/SoundLink";

interface BotCommand {
  name: string;
  description: string;
  usage: string;
  example: string;
  tier: "free" | "premium";
  tierLabel: string;
}

const BOT_COMMANDS: BotCommand[] = [
  {
    name: "/rank",
    description: "View your current rank, CR, and placement in the leaderboard.",
    usage: "/rank [user]",
    example: "/rank @PlayerName",
    tier: "free",
    tierLabel: "Free",
  },
  {
    name: "/stats",
    description: "View detailed match statistics including wins, losses, kills, and MVPs.",
    usage: "/stats [user]",
    example: "/stats @PlayerName",
    tier: "free",
    tierLabel: "Free",
  },
  {
    name: "/leaderboard",
    description: "View the top 100 ranked players in the server.",
    usage: "/leaderboard [page]",
    example: "/leaderboard 2",
    tier: "free",
    tierLabel: "Free",
  },
  {
    name: "/profile",
    description: "View a player's full profile card with rank badge, stats, and achievements.",
    usage: "/profile [user]",
    example: "/profile @PlayerName",
    tier: "free",
    tierLabel: "Free",
  },
  {
    name: "/help",
    description: "Show a list of all available bot commands with descriptions and usage examples.",
    usage: "/help [command]",
    example: "/help rank",
    tier: "free",
    tierLabel: "Free",
  },
  {
    name: "/customize",
    description: "Customize your profile colors, badge gradient, and username color. Opens the customization panel.",
    usage: "/customize",
    example: "/customize",
    tier: "premium",
    tierLabel: "💎 Premium",
  },
  {
    name: "/badge",
    description: "Apply a custom badge style to your rank display (glowing, pulsing, gradient, holographic).",
    usage: "/badge <style>",
    example: "/badge glowing",
    tier: "premium",
    tierLabel: "💎 Premium",
  },
  {
    name: "/history",
    description: "View your full match history with detailed per-match breakdowns.",
    usage: "/history [user] [page]",
    example: "/history @PlayerName 1",
    tier: "premium",
    tierLabel: "💎 Premium",
  },
  {
    name: "/compare",
    description: "Compare two players side-by-side with detailed stat breakdowns.",
    usage: "/compare <user1> <user2>",
    example: "/compare @Player1 @Player2",
    tier: "premium",
    tierLabel: "💎 Premium",
  },
  {
    name: "/export",
    description: "Export your stats as a CSV or JSON file for external analysis.",
    usage: "/export [format]",
    example: "/export csv",
    tier: "premium",
    tierLabel: "💎 Premium",
  },
  {
    name: "/tracker",
    description: "Set up a personal progress tracker to monitor your CR gains over time.",
    usage: "/tracker [goal_cr]",
    example: "/tracker 2000",
    tier: "premium",
    tierLabel: "💎 Premium",
  },
];

export default function PremiumCommandsPage() {
  const freeCommands = BOT_COMMANDS.filter((c) => c.tier === "free");
  const premiumCommands = BOT_COMMANDS.filter((c) => c.tier === "premium");

  return (
    <Shell>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">🤖 Bot Commands</h1>
            <p className="mt-2 text-zinc-400">
              All available EAS Arena Discord bot commands — free and premium.
            </p>
          </div>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-900/30"
          >
            💎 Get Premium →
          </SoundLink>
        </div>
      </div>

      {/* Premium CTA banner */}
      <div className="rounded-2xl border border-yellow-700/40 bg-gradient-to-br from-yellow-950/30 to-black p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-black text-yellow-300">Unlock all premium commands</p>
          <p className="mt-1 text-sm text-zinc-400">
            Get access to advanced stats, match history, comparisons, exports, and more for just $4.99/mo.
          </p>
        </div>
        <div className="flex gap-3">
          <SoundLink
            href="/redeem"
            soundType="click"
            className="rounded-xl border border-yellow-600/40 bg-yellow-950/20 px-4 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-900/30 transition"
          >
            🎁 Redeem Code
          </SoundLink>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            Subscribe →
          </SoundLink>
        </div>
      </div>

      {/* Free commands */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-2xl font-black">🆓 Free Commands</h2>
          <span className="rounded-lg border border-green-700/40 bg-green-950/20 px-2.5 py-0.5 text-xs font-black text-green-400">
            {freeCommands.length} commands
          </span>
          <span className="text-xs text-zinc-500">Available to everyone</span>
        </div>
        <div className="rounded-2xl border border-green-700/20 bg-green-950/5 p-4 space-y-3">
          {freeCommands.map((cmd) => (
            <CommandCard key={cmd.name} command={cmd} />
          ))}
        </div>
      </section>

      {/* Visual divider */}
      <div className="relative my-8 flex items-center gap-4">
        <div className="flex-1 border-t border-white/10" />
        <span className="rounded-xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-1.5 text-xs font-black text-yellow-400 tracking-wider">
          💎 PREMIUM UNLOCKS
        </span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      {/* Premium commands */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-2xl font-black">💎 Premium Commands</h2>
          <span className="rounded-lg border border-yellow-700/40 bg-yellow-950/20 px-2.5 py-0.5 text-xs font-black text-yellow-400">
            {premiumCommands.length} commands
          </span>
          <span className="text-xs text-zinc-500">Requires Premium subscription</span>
        </div>
        <div className="rounded-2xl border border-yellow-700/20 bg-yellow-950/5 p-4 space-y-3">
          {premiumCommands.map((cmd) => (
            <CommandCard key={cmd.name} command={cmd} />
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div className="mt-10 rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
        <p className="text-2xl font-black mb-2">Ready to unlock everything?</p>
        <p className="text-zinc-400 mb-6">
          Premium gives you access to all bot commands plus exclusive website features.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-3 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-900/30"
          >
            💎 Subscribe for $4.99/mo →
          </SoundLink>
          <SoundLink
            href="/giveaway/redeem"
            soundType="click"
            className="rounded-xl border border-white/10 px-8 py-3 font-bold text-zinc-300 hover:bg-white/5 transition"
          >
            🎁 Have a giveaway code?
          </SoundLink>
        </div>
      </div>
    </Shell>
  );
}

function CommandCard({ command }: { command: BotCommand }) {
  const isPremium = command.tier === "premium";

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        isPremium
          ? "border-yellow-700/30 bg-gradient-to-br from-yellow-950/10 to-[#0d0d14]"
          : "border-white/10 bg-[#0d0d14]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <code className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-orange-300">
            {command.name}
          </code>
          <span
            className={`rounded-lg border px-2 py-0.5 text-xs font-black ${
              isPremium
                ? "border-yellow-700/40 bg-yellow-950/20 text-yellow-400"
                : "border-green-700/40 bg-green-950/20 text-green-400"
            }`}
          >
            {command.tierLabel}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 font-mono">
            Usage: <span className="text-zinc-300">{command.usage}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-300">{command.description}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-zinc-500">Example:</span>
        <code className="rounded bg-white/5 px-2 py-0.5 text-xs font-mono text-zinc-300">
          {command.example}
        </code>
      </div>
    </div>
  );
}
