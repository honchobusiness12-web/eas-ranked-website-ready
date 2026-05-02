import Link from "next/link";
import { getRank } from "@/lib/ranks";

type Player = {
  user_id: string;
  name: string;
  username?: string | null;
  avatar_url?: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  ranked: boolean;
  registered: boolean;
  placement_matches: number;
};

async function getPlayers(): Promise<Player[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${base}/api/leaderboard`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

function Avatar({
  url,
  name,
  size = "md",
}: {
  url?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
  };
  const cls = sizeClasses[size];
  if (url)
    return (
      <img
        src={url}
        alt={name}
        className={`${cls} flex-shrink-0 rounded-full border border-violet-500/30 object-cover`}
      />
    );
  return (
    <div
      className={`${cls} flex-shrink-0 grid place-items-center rounded-full border border-violet-500/30 bg-violet-600/20 font-bold text-violet-300`}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function RankBadge({
  cr,
  ranked,
  placementMatches,
}: {
  cr: number;
  ranked: boolean;
  placementMatches: number;
}) {
  if (!ranked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-600/50 bg-zinc-800/60 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
        Placement {placementMatches}/7
      </span>
    );
  }
  const rank = getRank(cr);
  const tier = rank.split(" ")[0];
  const tierColors: Record<string, string> = {
    R1: "border-zinc-500/50 bg-zinc-700/40 text-zinc-300",
    R2: "border-green-600/50 bg-green-900/30 text-green-300",
    R3: "border-blue-500/50 bg-blue-900/30 text-blue-300",
    R4: "border-cyan-500/50 bg-cyan-900/30 text-cyan-300",
    R5: "border-violet-500/50 bg-violet-900/30 text-violet-300",
    R6: "border-purple-500/50 bg-purple-900/30 text-purple-300",
    R7: "border-pink-500/50 bg-pink-900/30 text-pink-300",
    R8: "border-orange-500/50 bg-orange-900/30 text-orange-300",
    R9: "border-yellow-500/50 bg-yellow-900/30 text-yellow-300",
    R10: "border-amber-400/60 bg-amber-900/30 text-amber-300",
  };
  const colorClass = tierColors[tier] || tierColors["R1"];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {rank}
    </span>
  );
}

function RankMedal({ index }: { index: number }) {
  if (index === 0)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400/20 text-base font-black text-yellow-300 ring-1 ring-yellow-400/40">
        1
      </span>
    );
  if (index === 1)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-400/20 text-base font-black text-zinc-300 ring-1 ring-zinc-400/40">
        2
      </span>
    );
  if (index === 2)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-700/20 text-base font-black text-orange-400 ring-1 ring-orange-600/40">
        3
      </span>
    );
  return (
    <span className="flex h-8 w-8 items-center justify-center text-sm font-bold text-zinc-500">
      {index + 1}
    </span>
  );
}

const RANK_TIERS = [
  { tier: "R1", name: "Rookie",      range: "0 – 399",   color: "text-zinc-300",   border: "border-zinc-500/40",   bg: "bg-zinc-700/20"   },
  { tier: "R2", name: "Amateur",     range: "400 – 699",  color: "text-green-300",  border: "border-green-600/40",  bg: "bg-green-900/20"  },
  { tier: "R3", name: "Pro",         range: "700 – 999",  color: "text-blue-300",   border: "border-blue-500/40",   bg: "bg-blue-900/20"   },
  { tier: "R4", name: "Elite",       range: "1000 – 1199",color: "text-cyan-300",   border: "border-cyan-500/40",   bg: "bg-cyan-900/20"   },
  { tier: "R5", name: "All-Star",    range: "1200 – 1599",color: "text-violet-300", border: "border-violet-500/40", bg: "bg-violet-900/20" },
  { tier: "R6", name: "SuperStar",   range: "1600 – 2099",color: "text-purple-300", border: "border-purple-500/40", bg: "bg-purple-900/20" },
  { tier: "R7", name: "Remorseless", range: "2100 – 2749",color: "text-pink-300",   border: "border-pink-500/40",   bg: "bg-pink-900/20"   },
  { tier: "R8", name: "Legend",      range: "2750 – 3549",color: "text-orange-300", border: "border-orange-500/40", bg: "bg-orange-900/20" },
  { tier: "R9", name: "Unreal",      range: "3550 – 4499",color: "text-yellow-300", border: "border-yellow-500/40", bg: "bg-yellow-900/20" },
  { tier: "R10",name: "Hall of Fame",range: "4500+",      color: "text-amber-300",  border: "border-amber-400/50",  bg: "bg-amber-900/20"  },
];

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "#dashboard",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Leaderboard",
    href: "#leaderboard",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Ranks",
    href: "#ranks",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    label: "Activity",
    href: "#activity",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: "Players",
    href: "#players",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default async function Home() {
  const players = await getPlayers();
  const top25 = players.slice(0, 25);
  const rankedCount = players.filter((p) => p.ranked).length;
  const totalMatches = players.reduce((sum, p) => sum + p.matches, 0);
  const avgCR =
    players.length > 0
      ? Math.round(players.reduce((sum, p) => sum + p.cr, 0) / players.length)
      : 0;

  const recentActivity = players
    .filter((p) => p.matches > 0)
    .slice(0, 5)
    .map((p) => ({
      player: p,
      result: p.wins > p.losses ? "win" : p.wins < p.losses ? "loss" : "draw",
    }));

  return (
    <div className="flex min-h-screen bg-[#05050b] text-white">
      {/* ── Fixed Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-[#08080f] lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/50">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l7.5-7.5 4.5 4.5 6-6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black tracking-wide text-white">EAS Ranked</p>
            <p className="text-[10px] uppercase tracking-widest text-violet-400">Elevate All-Stars</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-zinc-200"
            >
              {icon}
              {label}
            </a>
          ))}
        </nav>

        {/* Season card */}
        <div className="m-3 rounded-2xl border border-violet-500/20 bg-violet-600/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Current Season</p>
          <p className="mt-1 text-lg font-black text-white">Season 1</p>
          <p className="mt-1 text-xs text-zinc-400">
            Compete for top placement and exclusive rewards.
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-violet-500 to-purple-400" />
          </div>
          <p className="mt-1.5 text-right text-[10px] text-zinc-500">62% complete</p>
        </div>
      </aside>

      {/* ── Main content (offset for fixed sidebar) ── */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-[#08080f]/90 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Dashboard</h1>
            <p className="text-xs text-zinc-500">Live competitive data · EAS Ranked</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-zinc-400">Live</span>
          </div>
        </header>

        <main className="flex-1 space-y-10 overflow-auto p-6">

          {/* ── Stats cards ── */}
          <section id="dashboard">
            <div className="mb-3">
              <h2 className="text-base font-black text-white">Overview</h2>
              <p className="text-xs text-zinc-500">Season 1 at a glance</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Players",
                  value: players.length,
                  sub: "in database",
                  color: "violet",
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ),
                },
                {
                  label: "Ranked Players",
                  value: rankedCount,
                  sub: `${players.length > 0 ? Math.round((rankedCount / players.length) * 100) : 0}% of total`,
                  color: "emerald",
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  ),
                },
                {
                  label: "Matches Played",
                  value: totalMatches.toLocaleString(),
                  sub: "across all players",
                  color: "blue",
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                },
                {
                  label: "Average CR",
                  value: avgCR,
                  sub: getRank(avgCR),
                  color: "amber",
                  icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ),
                },
              ].map(({ label, value, sub, color, icon }) => {
                const palette: Record<string, { card: string; icon: string; val: string }> = {
                  violet: {
                    card: "border-violet-500/20 bg-violet-600/[0.07]",
                    icon: "bg-violet-600/20 text-violet-400",
                    val: "text-violet-100",
                  },
                  emerald: {
                    card: "border-emerald-500/20 bg-emerald-600/[0.07]",
                    icon: "bg-emerald-600/20 text-emerald-400",
                    val: "text-emerald-100",
                  },
                  blue: {
                    card: "border-blue-500/20 bg-blue-600/[0.07]",
                    icon: "bg-blue-600/20 text-blue-400",
                    val: "text-blue-100",
                  },
                  amber: {
                    card: "border-amber-500/20 bg-amber-600/[0.07]",
                    icon: "bg-amber-600/20 text-amber-400",
                    val: "text-amber-100",
                  },
                };
                const p = palette[color];
                return (
                  <div key={label} className={`rounded-2xl border p-5 ${p.card}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          {label}
                        </p>
                        <p className={`mt-2 text-3xl font-black ${p.val}`}>{value}</p>
                        <p className="mt-1 text-xs text-zinc-500">{sub}</p>
                      </div>
                      <div className={`rounded-xl p-2.5 ${p.icon}`}>{icon}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Season info card ── */}
          <section>
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/30 via-purple-900/20 to-[#0c0c14] p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-purple-600/10 blur-2xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                    Current Season
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">Season 1</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Compete for top placement and earn exclusive end-of-season rewards.
                  </p>
                </div>
                <div className="min-w-[180px]">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                    <span>Season progress</span>
                    <span className="font-bold text-violet-400">62%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-violet-500 to-purple-400" />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {rankedCount} ranked · {players.length} total players
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Leaderboard (top 25) ── */}
          <section id="leaderboard">
            <div className="mb-3">
              <h2 className="text-base font-black text-white">Leaderboard</h2>
              <p className="text-xs text-zinc-500">Top 25 players ranked by Competitive Rating</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c14]">
              {/* Table header */}
              <div className="grid grid-cols-[48px_1fr_160px_90px_80px] gap-2 border-b border-white/[0.07] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <span>#</span>
                <span>Player</span>
                <span>Rank</span>
                <span className="text-right">W / L</span>
                <span className="text-right">CR</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.04]">
                {top25.map((player, index) => (
                  <Link
                    href={`/profile/${player.user_id}`}
                    key={player.user_id}
                    className="grid grid-cols-[48px_1fr_160px_90px_80px] items-center gap-2 px-6 py-3.5 transition hover:bg-white/[0.03]"
                  >
                    <div className="flex justify-center">
                      <RankMedal index={index} />
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar url={player.avatar_url} name={player.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {player.name || "Unknown Player"}
                        </p>
                        {player.username && (
                          <p className="truncate text-xs text-zinc-500">@{player.username}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <RankBadge
                        cr={player.cr}
                        ranked={player.ranked}
                        placementMatches={player.placement_matches}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-zinc-300">
                        {player.wins}W
                        <span className="text-zinc-600"> / </span>
                        {player.losses}L
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-violet-300">{player.cr}</p>
                      <p className="text-[10px] text-zinc-600">CR</p>
                    </div>
                  </Link>
                ))}
                {players.length === 0 && (
                  <div className="px-6 py-12 text-center text-sm text-zinc-600">
                    No players found. Check your{" "}
                    <code className="rounded bg-white/5 px-1 py-0.5 text-xs text-zinc-400">
                      DATABASE_URL
                    </code>{" "}
                    in Railway.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Rank system ── */}
          <section id="ranks">
            <div className="mb-3">
              <h2 className="text-base font-black text-white">Rank System</h2>
              <p className="text-xs text-zinc-500">R1 through R10 — earn CR to climb the ladder</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {RANK_TIERS.map(({ tier, name, range, color, border, bg }) => (
                <div
                  key={tier}
                  className={`rounded-xl border p-4 ${border} ${bg}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-widest ${color}`}>
                      {tier}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${border} ${color}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                      {tier}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm font-bold ${color}`}>{name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{range} CR</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Recent activity ── */}
          <section id="activity">
            <div className="mb-3">
              <h2 className="text-base font-black text-white">Recent Activity</h2>
              <p className="text-xs text-zinc-500">Top 5 active players</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c14]">
              <div className="divide-y divide-white/[0.04]">
                {recentActivity.map(({ player, result }) => (
                  <Link
                    href={`/profile/${player.user_id}`}
                    key={player.user_id}
                    className="flex items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03]"
                  >
                    <Avatar url={player.avatar_url} name={player.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{player.name}</p>
                      <p className="text-xs text-zinc-500">
                        {player.cr} CR · {player.matches} matches · {player.wins}W {player.losses}L
                      </p>
                    </div>
                    <RankBadge
                      cr={player.cr}
                      ranked={player.ranked}
                      placementMatches={player.placement_matches}
                    />
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        result === "win"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : result === "loss"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-zinc-500/15 text-zinc-400"
                      }`}
                    >
                      {result}
                    </span>
                  </Link>
                ))}
                {recentActivity.length === 0 && (
                  <p className="px-6 py-10 text-center text-xs text-zinc-600">No activity yet.</p>
                )}
              </div>
            </div>
          </section>

          {/* ── All players ── */}
          <section id="players">
            <div className="mb-3">
              <h2 className="text-base font-black text-white">All Players</h2>
              <p className="text-xs text-zinc-500">Every registered player in the database</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c14]">
              {/* Table header */}
              <div className="grid grid-cols-[48px_1fr_160px_90px_80px] gap-2 border-b border-white/[0.07] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <span>#</span>
                <span>Player</span>
                <span>Rank</span>
                <span className="text-right">W / L</span>
                <span className="text-right">CR</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {players.map((player, index) => (
                  <Link
                    href={`/profile/${player.user_id}`}
                    key={player.user_id}
                    className="grid grid-cols-[48px_1fr_160px_90px_80px] items-center gap-2 px-6 py-3.5 transition hover:bg-white/[0.03]"
                  >
                    <div className="flex justify-center">
                      <RankMedal index={index} />
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar url={player.avatar_url} name={player.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {player.name || "Unknown Player"}
                        </p>
                        {player.username && (
                          <p className="truncate text-xs text-zinc-500">@{player.username}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <RankBadge
                        cr={player.cr}
                        ranked={player.ranked}
                        placementMatches={player.placement_matches}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-zinc-300">
                        {player.wins}W
                        <span className="text-zinc-600"> / </span>
                        {player.losses}L
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-violet-300">{player.cr}</p>
                      <p className="text-[10px] text-zinc-600">CR</p>
                    </div>
                  </Link>
                ))}
                {players.length === 0 && (
                  <div className="px-6 py-12 text-center text-sm text-zinc-600">
                    No players found. Check your{" "}
                    <code className="rounded bg-white/5 px-1 py-0.5 text-xs text-zinc-400">
                      DATABASE_URL
                    </code>{" "}
                    in Railway.
                  </div>
                )}
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
