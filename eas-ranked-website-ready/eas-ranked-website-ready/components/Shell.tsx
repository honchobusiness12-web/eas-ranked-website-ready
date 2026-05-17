"use client";

import SoundLink from "@/components/SoundLink";
import SoundToggle from "@/components/SoundToggle";
import AuthButton from "@/components/AuthButton";
import ProfileMenu from "@/components/ProfileMenu";
import CopyButton from "@/components/CopyButton";
import { useState, useEffect } from "react";
import type { DiscordUser } from "@/lib/auth";

const links = [
  { label: "🏠 Dashboard",         href: "/" },
  { label: "🏆 Leaderboard",       href: "/leaderboard" },
  { label: "👥 Players",           href: "/players" },
  { label: "⚔️ Compare",           href: "/compare" },
  { label: "📋 Placements",        href: "/placements" },
  { label: "🏷️ Ranks",             href: "/ranks" },
  { label: "📖 How Ranked Works",  href: "/guide" },
  { label: "🤖 Bot Commands",      href: "/premium/commands" },
  { label: "🎁 Redeem Code",       href: "/redeem" },
  { label: "💎 Get Premium",       href: "/premium/subscribe" },
];

const premiumLinks = [
  { label: "📊 Advanced Stats",    href: "/premium/stats" },
  { label: "🎨 Cosmetics",         href: "/premium/cosmetics" },
  { label: "🌈 Customize Colors",  href: "/cosmetics/colors" },
  { label: "⚔️ Comparisons",       href: "/premium/comparisons" },
  { label: "📥 Export Stats",      href: "/premium/export" },
  { label: "📜 Match History",     href: "/premium/matches" },
  { label: "🎯 Progress Tracker",  href: "/premium/tracker" },
  { label: "⚙️ Manage Sub",        href: "/premium/manage" },
];

const adminLinks = [
  { label: "🎁 Giveaway Manager", href: "/admin/giveaways" },
  { label: "⚙️ CR Admin",         href: "/admin/cr" },
  { label: "📢 Announcements",    href: "/admin/announcements" },
  { label: "🏆 Seasons",          href: "/admin/seasons" },
  { label: "🏅 Badge Manager",    href: "/admin/badges" },
  { label: "👥 Player Management",href: "/admin/players" },
  { label: "💎 Premium Manager",  href: "/admin/premium" },
  { label: "📋 Leaderboard Mgmt", href: "/admin/leaderboard" },
  { label: "📊 Analytics",        href: "/admin/analytics" },
  { label: "🛡️ Moderation",       href: "/admin/moderation" },
];

interface ShellSeason {
  name: string;
  status: "active" | "paused" | "ended" | "upcoming";
  end_date: string | null;
  start_date: string | null;
}

function SeasonStatusWidget({ season }: { season: ShellSeason | null }) {
  if (!season) {
    return (
      <>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-zinc-500">🏆 Season</p>
          <span className="rounded-full border border-zinc-700/50 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">OFF</span>
        </div>
        <p className="mt-1 text-[10px] text-zinc-700">No active season</p>
      </>
    );
  }

  const statusBadge = {
    active:   { label: "LIVE",   cls: "border-green-500/30 bg-green-500/15 text-green-300" },
    paused:   { label: "PAUSED", cls: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300" },
    ended:    { label: "ENDED",  cls: "border-red-500/30 bg-red-500/15 text-red-300" },
    upcoming: { label: "SOON",   cls: "border-blue-500/30 bg-blue-500/15 text-blue-300" },
  }[season.status] ?? { label: "OFF", cls: "border-zinc-700/50 bg-zinc-800/60 text-zinc-500" };

  let daysNote = "";
  if (season.end_date && season.status === "active") {
    const daysLeft = Math.max(0, Math.round((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    daysNote = `${daysLeft}d left`;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-semibold text-zinc-400 truncate">{season.name}</p>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>
      {daysNote && <p className="mt-0.5 text-[10px] text-purple-400/80">⏳ {daysNote}</p>}
      {!daysNote && season.status === "paused" && <p className="mt-0.5 text-[10px] text-yellow-400/70">⏸ Paused</p>}
      {!daysNote && season.status === "upcoming" && <p className="mt-0.5 text-[10px] text-blue-400/70">🔵 Coming soon</p>}
      {!daysNote && season.status === "ended" && <p className="mt-0.5 text-[10px] text-red-400/70">🔴 Ended</p>}
    </>
  );
}

export default function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: DiscordUser | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [season, setSeason] = useState<ShellSeason | null>(null);

  useEffect(() => {
    if (!user) return;
    // Admin nav is developer-only — probe the CR logs endpoint (403 = not developer)
    fetch("/api/admin/cr/logs?limit=1")
      .then((r) => { if (r.ok) setIsOwner(true); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetch("/api/seasons/current")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.season) setSeason(data.season as ShellSeason);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen text-white" style={{ background: "#04040e" }}>
      <div className="flex">
        {/* ── Sidebar — desktop ── */}
        <aside className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-white/[0.05] md:flex" style={{ background: "rgba(7,7,26,0.95)", backdropFilter: "blur(20px)" }}>
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/[0.05]">
            <SoundLink href="/" soundType="click" className="group block">
              <span className="text-xl font-black tracking-tight text-white/90 group-hover:text-white transition-colors">EAS </span>
              <span className="text-xl font-black tracking-tight summer-text-gradient">ARENA</span>
            </SoundLink>
            <p className="mt-0.5 text-[10px] text-zinc-600 font-medium tracking-wider uppercase">Ranked Dashboard</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 text-sm">
            {links.map(({ label, href }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="success"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-500 transition-all duration-200 hover:bg-white/[0.05] hover:text-zinc-200"
              >
                {label}
              </SoundLink>
            ))}

            {/* Premium section */}
            <div className="pt-4 pb-1.5 px-3">
              <div className="flex items-center gap-1.5">
                <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70">Premium</p>
                <div className="h-px flex-1 bg-gradient-to-l from-yellow-500/30 to-transparent" />
              </div>
            </div>
            {premiumLinks.map(({ label, href }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="success"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-600 transition-all duration-200 hover:bg-yellow-500/[0.07] hover:text-yellow-300"
              >
                {label}
              </SoundLink>
            ))}

            {/* Admin section — owner only */}
            {isOwner && (
              <>
                <div className="pt-4 pb-1.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-px flex-1 bg-gradient-to-r from-red-500/30 to-transparent" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/70">Admin</p>
                    <div className="h-px flex-1 bg-gradient-to-l from-red-500/30 to-transparent" />
                  </div>
                </div>
                {adminLinks.map(({ label, href }) => (
                  <SoundLink
                    key={href}
                    href={href}
                    soundType="success"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-600 transition-all duration-200 hover:bg-red-500/[0.07] hover:text-red-300"
                  >
                    {label}
                  </SoundLink>
                ))}
              </>
            )}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-white/[0.05] px-3 py-3 space-y-2">
            {/* Logged-in profile shortcut */}
            {user && (
              <SoundLink
                href={`/profile/${user.id}`}
                soundType="click"
                className="flex items-center gap-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] px-3 py-2.5 text-sm font-semibold text-indigo-300 transition-all duration-200 hover:border-indigo-400/30 hover:bg-indigo-500/[0.12] hover:text-white"
              >
                <span className="text-base">👤</span>
                <span className="truncate text-sm">{user.global_name || user.username}</span>
                <CopyButton text={user.id} size="xs" className="ml-auto shrink-0 opacity-40 hover:opacity-100" />
              </SoundLink>
            )}

            {/* Season status card */}
            <SoundLink
              href={isOwner ? "/admin/seasons" : "/"}
              soundType="click"
              className="block rounded-xl border border-purple-500/15 bg-purple-500/[0.06] px-3 py-2.5 transition-all duration-200 hover:border-purple-400/25 hover:bg-purple-500/[0.10]"
            >
              <SeasonStatusWidget season={season} />
            </SoundLink>
          </div>
        </aside>

        <section className="w-full md:ml-60">
          {/* ── Top header ── */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/[0.05] px-4 backdrop-blur-xl md:px-6" style={{ background: "rgba(4,4,14,0.85)" }}>
            {/* Mobile menu button */}
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm transition-all duration-200 hover:bg-white/[0.08] md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-purple-400/70">Elevate All-Stars</p>
              <p className="text-sm font-black leading-tight tracking-tight">Ranked Dashboard</p>
            </div>

            <div className="flex items-center gap-1.5">
              <ProfileMenu />
              <SoundToggle />
              <AuthButton initialUser={user} />
            </div>
          </header>

          {/* ── Mobile nav drawer ── */}
          {mobileOpen && (
            <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileOpen(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div
                className="absolute left-0 top-0 h-full w-60 border-r border-white/[0.05] flex flex-col"
                style={{ background: "rgba(7,7,26,0.98)", backdropFilter: "blur(20px)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <SoundLink href="/" soundType="click" className="block text-xl font-black" onClick={() => setMobileOpen(false)}>
                    EAS <span className="summer-text-gradient">ARENA</span>
                  </SoundLink>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 text-sm">
                  {links.map(({ label, href }) => (
                    <SoundLink
                      key={href}
                      href={href}
                      soundType="success"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-500 transition-all duration-200 hover:bg-white/[0.05] hover:text-zinc-200"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </SoundLink>
                  ))}

                  {user && (
                    <>
                      <div className="pt-4 pb-1.5 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/70">Profile</p>
                      </div>
                      <SoundLink
                        href={`/profile/${user.id}`}
                        soundType="click"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-500 transition-all duration-200 hover:bg-indigo-500/[0.07] hover:text-indigo-300"
                        onClick={() => setMobileOpen(false)}
                      >
                        👤 My Profile
                      </SoundLink>
                    </>
                  )}

                  <div className="pt-4 pb-1.5 px-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70">Premium</p>
                  </div>
                  {premiumLinks.map(({ label, href }) => (
                    <SoundLink
                      key={href}
                      href={href}
                      soundType="success"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-600 transition-all duration-200 hover:bg-yellow-500/[0.07] hover:text-yellow-300"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </SoundLink>
                  ))}

                  {isOwner && (
                    <>
                      <div className="pt-4 pb-1.5 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/70">Admin</p>
                      </div>
                      {adminLinks.map(({ label, href }) => (
                        <SoundLink
                          key={href}
                          href={href}
                          soundType="success"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-600 transition-all duration-200 hover:bg-red-500/[0.07] hover:text-red-300"
                          onClick={() => setMobileOpen(false)}
                        >
                          {label}
                        </SoundLink>
                      ))}
                    </>
                  )}
                </nav>
              </div>
            </div>
          )}

          {/* ── Page content ── */}
          <div className="px-4 py-6 md:px-6 md:py-8 animate-fade-in max-w-[1400px]">{children}</div>

          <footer className="mx-4 mt-8 border-t border-white/[0.05] py-5 text-center text-xs text-zinc-700 md:mx-6">
            <span className="summer-text-gradient font-bold">EAS Arena</span>
            <span className="text-zinc-700"> · © 2026 · All rights reserved</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
