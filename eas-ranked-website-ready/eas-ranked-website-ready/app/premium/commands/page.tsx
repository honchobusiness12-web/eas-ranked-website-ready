"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";

interface Command {
  name: string;
  description: string;
  usage: string;
  example: string;
  premium: boolean;
  category: "stats" | "profile" | "cosmetics" | "utility";
}

const COMMANDS: Command[] = [
  // ── Free commands ──────────────────────────────────────────────────────────
  {
    name: "/rank",
    description: "Check your current rank and CR.",
    usage: "/rank",
    example: "/rank",
    premium: false,
    category: "stats",
  },
  {
    name: "/leaderboard",
    description: "View the top players on the leaderboard.",
    usage: "/leaderboard [page]",
    example: "/leaderboard 1",
    premium: false,
    category: "stats",
  },
  {
    name: "/profile",
    description: "View a player's public profile.",
    usage: "/profile [user]",
    example: "/profile @PlayerName",
    premium: false,
    category: "profile",
  },
  {
    name: "/stats",
    description: "View your basic stats: wins, losses, kills, and matches.",
    usage: "/stats",
    example: "/stats",
    premium: false,
    category: "stats",
  },
  {
    name: "/redeem",
    description: "Redeem a premium giveaway code.",
    usage: "/redeem <code>",
    example: "/redeem EAS-1WEEK",
    premium: false,
    category: "utility",
  },
  // ── Premium commands ───────────────────────────────────────────────────────
  {
    name: "/advancedstats",
    description: "View detailed advanced statistics including win-rate trends, CR progression charts, and per-match breakdowns.",
    usage: "/advancedstats [user]",
    example: "/advancedstats @PlayerName",
    premium: true,
    category: "stats",
  },
  {
    name: "/compare",
    description: "Compare two players side-by-side with full stat breakdowns.",
    usage: "/compare <player1> <player2>",
    example: "/compare @Player1 @Player2",
    premium: true,
    category: "stats",
  },
  {
    name: "/matchhistory",
    description: "View your full match history with detailed results for every game.",
    usage: "/matchhistory [page]",
    example: "/matchhistory 2",
    premium: true,
    category: "stats",
  },
  {
    name: "/tracker",
    description: "Enable CR progress tracking — get notified when you rank up or down.",
    usage: "/tracker",
    example: "/tracker",
    premium: true,
    category: "stats",
  },
  {
    name: "/cosmetics",
    description: "Open the cosmetics selector to customise your rank badge, theme, title, gradient, and username color.",
    usage: "/cosmetics",
    example: "/cosmetics",
    premium: true,
    category: "cosmetics",
  },
  {
    name: "/settheme",
    description: "Quickly switch your profile theme (dark, neon, gradient, summer, cyberpunk, ocean).",
    usage: "/settheme <theme>",
    example: "/settheme neon",
    premium: true,
    category: "cosmetics",
  },
  {
    name: "/settitle",
    description: "Set a custom player title that appears on your profile.",
    usage: "/settitle <title>",
    example: "/settitle 🔥 Grinder",
    premium: true,
    category: "cosmetics",
  },
  {
    name: "/export",
    description: "Export your full stats as a CSV or JSON file.",
    usage: "/export [format]",
    example: "/export csv",
    premium: true,
    category: "utility",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  all:       "All Commands",
  stats:     "📊 Stats",
  profile:   "👤 Profile",
  cosmetics: "🎨 Cosmetics",
  utility:   "🔧 Utility",
};

export default function PremiumCommandsPage() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");
  const [category, setCategory] = useState<"all" | "stats" | "profile" | "cosmetics" | "utility">("all");

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.user) {
          const statusRes = await fetch(`/api/premium/status?userId=${meData.user.id}`);
          const statusData = await statusRes.json();
          setIsPremium(statusData.premium ?? false);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const filtered = COMMANDS.filter((cmd) => {
    const matchFilter =
      filter === "all" ? true : filter === "premium" ? cmd.premium : !cmd.premium;
    const matchCategory = category === "all" ? true : cmd.category === category;
    return matchFilter && matchCategory;
  });

  const premiumCount = COMMANDS.filter((c) => c.premium).length;
  const freeCount = COMMANDS.filter((c) => !c.premium).length;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🤖 Bot Commands</h1>
          <p className="mt-2 text-zinc-400">
            All available EAS Arena Discord bot commands. Premium commands require an active subscription.
          </p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4 text-center">
          <p className="text-2xl font-black">{COMMANDS.length}</p>
          <p className="text-xs text-zinc-400 mt-1">Total Commands</p>
        </div>
        <div className="rounded-2xl border border-green-700/30 bg-green-950/10 p-4 text-center">
          <p className="text-2xl font-black text-green-400">{freeCount}</p>
          <p className="text-xs text-zinc-400 mt-1">Free Commands</p>
        </div>
        <div className="rounded-2xl border border-yellow-700/30 bg-yellow-950/10 p-4 text-center">
          <p className="text-2xl font-black text-yellow-400">{premiumCount}</p>
          <p className="text-xs text-zinc-400 mt-1">Premium Commands</p>
        </div>
      </div>

      {/* Premium upsell for non-premium users */}
      {!loading && !isPremium && (
        <div className="rounded-2xl border border-yellow-700/40 bg-gradient-to-br from-yellow-950/30 to-black p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black text-yellow-300">💎 Unlock {premiumCount} Premium Commands</p>
            <p className="text-sm text-zinc-400 mt-1">
              Get access to advanced stats, cosmetics, match history, and more.
            </p>
          </div>
          <div className="flex gap-3">
            <SoundLink
              href="/redeem"
              soundType="click"
              className="rounded-xl border border-yellow-600/40 px-4 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-950/30 transition"
            >
              🎁 Redeem Code
            </SoundLink>
            <SoundLink
              href="/premium/subscribe"
              soundType="success"
              className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
            >
              Subscribe →
            </SoundLink>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Type filter */}
        {(["all", "free", "premium"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition capitalize ${
              filter === f
                ? "border-yellow-500 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-yellow-600/40 hover:text-white"
            }`}
          >
            {f === "all" ? "All" : f === "free" ? "🆓 Free" : "💎 Premium"}
          </button>
        ))}
        <div className="w-px bg-white/10 mx-1" />
        {/* Category filter */}
        {(["all", "stats", "profile", "cosmetics", "utility"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
              category === cat
                ? "border-blue-500 bg-blue-950/30 text-blue-300"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-blue-600/40 hover:text-white"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Commands list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-10 text-center text-zinc-500">
            No commands match your filters.
          </div>
        )}
        {filtered.map((cmd) => (
          <div
            key={cmd.name}
            className={`rounded-2xl border p-5 transition ${
              cmd.premium
                ? "border-yellow-700/30 bg-gradient-to-br from-yellow-950/10 to-black"
                : "border-white/10 bg-[#0d0d14]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <code className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-sm font-black text-white">
                  {cmd.name}
                </code>
                {cmd.premium ? (
                  <span className="rounded-lg border border-yellow-600/50 bg-yellow-950/30 px-2 py-0.5 text-xs font-black text-yellow-400">
                    💎 Premium
                  </span>
                ) : (
                  <span className="rounded-lg border border-green-700/40 bg-green-950/20 px-2 py-0.5 text-xs font-black text-green-400">
                    🆓 Free
                  </span>
                )}
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-400 capitalize">
                  {CATEGORY_LABELS[cmd.category]}
                </span>
              </div>
              {cmd.premium && !isPremium && (
                <SoundLink
                  href="/premium/subscribe"
                  soundType="click"
                  className="rounded-lg border border-yellow-600/40 px-3 py-1 text-xs font-bold text-yellow-400 hover:bg-yellow-950/30 transition"
                >
                  Unlock →
                </SoundLink>
              )}
            </div>

            <p className="mt-3 text-sm text-zinc-300">{cmd.description}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Usage</p>
                <code className="text-xs text-zinc-300 font-mono">{cmd.usage}</code>
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Example</p>
                <code className="text-xs text-zinc-300 font-mono">{cmd.example}</code>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-8 rounded-2xl border border-white/5 bg-white/5 p-5 text-sm text-zinc-400">
        <p className="font-bold text-zinc-300 mb-2">ℹ️ Using the Bot</p>
        <p>• All commands are used in the EAS Arena Discord server.</p>
        <p>• Premium commands require an active Premium subscription or a valid giveaway code.</p>
        <p>• Redeem codes at <SoundLink href="/redeem" soundType="click" className="text-yellow-400 hover:text-yellow-300 font-bold transition">/redeem</SoundLink> or with <code className="font-mono text-xs bg-white/10 px-1 rounded">/redeem &lt;code&gt;</code> in Discord.</p>
        <p className="mt-2">
          Don&apos;t have Premium?{" "}
          <SoundLink href="/premium/subscribe" soundType="click" className="text-yellow-400 hover:text-yellow-300 font-bold transition">
            Subscribe for $4.99/mo →
          </SoundLink>
        </p>
      </div>
    </Shell>
  );
}
