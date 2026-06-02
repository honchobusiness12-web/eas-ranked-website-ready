"use client";

import SoundLink from "@/components/SoundLink";
import SoundToggle from "@/components/SoundToggle";
import AuthButton from "@/components/AuthButton";
import ProfileMenu from "@/components/ProfileMenu";
import CopyButton from "@/components/CopyButton";
import { PageTransition } from "@/components/PageTransition";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DiscordUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

const links = [
  { label: "Dashboard",        href: "/",            emoji: "🏠" },
  { label: "Leaderboard",      href: "/leaderboard", emoji: "🏆" },
  { label: "Players",          href: "/players",     emoji: "👥" },
  { label: "Compare",          href: "/compare",     emoji: "⚔️" },
  { label: "Placements",       href: "/placements",  emoji: "📋" },
  { label: "Live",             href: "/live",        emoji: "🔴", live: true },
  { label: "Ranks",            href: "/ranks",       emoji: "🏷️" },
  { label: "How Ranked Works", href: "/guide",       emoji: "📖" },
];

const adminLinks = [
  { label: "Giveaway Manager",  href: "/admin/giveaways",    emoji: "🎁" },
  { label: "CR Admin",          href: "/admin/cr",           emoji: "⚙️" },
  { label: "Announcements",     href: "/admin/announcements",emoji: "📢" },
  { label: "Seasons",           href: "/admin/seasons",      emoji: "🏆" },
  { label: "Badge Manager",     href: "/admin/badges",       emoji: "🏅" },
  { label: "Player Management", href: "/admin/players",      emoji: "👥" },
  { label: "Leaderboard Mgmt",  href: "/admin/leaderboard",  emoji: "📋" },
  { label: "Analytics",         href: "/admin/analytics",    emoji: "📊" },
  { label: "Moderation",        href: "/admin/moderation",   emoji: "🛡️" },
];

// ---------------------------------------------------------------------------
// Season widget
// ---------------------------------------------------------------------------

interface ShellSeason {
  name: string;
  status: "active" | "paused" | "ended" | "upcoming";
  end_date: string | null;
  start_date: string | null;
}

function SeasonStatusWidget({ season }: { season: ShellSeason | null }) {
  if (!season) {
    return (
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{ background: "rgba(0,207,255,0.10)", border: "1px solid rgba(0,207,255,0.2)" }}
        >
          🏆
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate" style={{ color: "rgba(168,255,246,0.7)" }}>No active season</p>
          <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.45)" }}>Off season</p>
        </div>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ borderColor: "rgba(0,207,255,0.25)", background: "rgba(0,207,255,0.08)", color: "rgba(0,207,255,0.7)" }}>
          OFF
        </span>
      </div>
    );
  }

  const statusBadge = {
    active:   { label: "LIVE",   cls: "border-green-500/40 bg-green-500/10 text-green-400" },
    paused:   { label: "PAUSED", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
    ended:    { label: "ENDED",  cls: "border-red-500/40 bg-red-500/10 text-red-400" },
    upcoming: { label: "SOON",   cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400" },
  }[season.status] ?? { label: "OFF", cls: "border-white/10 bg-white/5 text-white/40" };

  let daysLeft = 0;
  let progressPct = 0;
  if (season.end_date && season.status === "active") {
    daysLeft = Math.max(0, Math.round((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }
  if (season.start_date && season.end_date) {
    const start = new Date(season.start_date).getTime();
    const end = new Date(season.end_date).getTime();
    const now = Date.now();
    if (end > start) progressPct = Math.round((Math.max(0, Math.min(now - start, end - start)) / (end - start)) * 100);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{ background: "rgba(0,207,255,0.12)", border: "1px solid rgba(0,207,255,0.22)" }}
        >
          🏆
        </div>
        <p className="flex-1 text-xs font-semibold truncate min-w-0" style={{ color: "#A8FFF6" }}>{season.name}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>
      {season.start_date && season.end_date && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "rgba(168,255,246,0.5)" }}>{progressPct}% complete</span>
            {daysLeft > 0 && <span className="text-[10px] font-semibold" style={{ color: "#00CFFF" }}>⏳ {daysLeft}d left</span>}
          </div>
          <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(0,207,255,0.12)" }}>
            <div
              className="h-full rounded-full season-progress-bar"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #00CFFF, #4DEEEA, #A8FFF6)",
                boxShadow: "0 0 8px rgba(0,207,255,0.6)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export default function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: DiscordUser | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [season, setSeason] = useState<ShellSeason | null>(null);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/cr/logs?limit=1")
      .then((r) => { if (r.ok) setIsOwner(true); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetch("/api/seasons/current")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.season) setSeason(data.season as ShellSeason); })
      .catch(() => {});
  }, []);

  const sidebarW = sidebarCollapsed ? "w-[68px]" : "w-64";
  const contentML = sidebarCollapsed ? "md:ml-[68px]" : "md:ml-64";

  return (
    <main className="min-h-screen" style={{ background: "#062B45", color: "#e2f4ff" }}>
      <div className="flex">

        {/* ── Sidebar — desktop ── */}
        <aside
          className={`fixed left-0 top-0 hidden h-screen flex-col md:flex transition-all duration-300 ${sidebarW} z-40 overflow-y-auto sidebar-premium`}
        >
          {/* Logo + collapse */}
          <div className="flex items-center justify-between px-3 py-4" style={{ borderBottom: "1px solid rgba(0,207,255,0.15)" }}>
            {!sidebarCollapsed ? (
              <>
                <SoundLink href="/" soundType="click" className="group flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg logo-glow"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,207,255,0.22), rgba(77,238,234,0.15))",
                      border: "1px solid rgba(0,207,255,0.35)",
                    }}
                  >
                    🌊
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black tracking-tight leading-none" style={{ color: "#e2f4ff" }}>
                      EAS <span className="summer-text-gradient">ARENA</span>
                    </p>
                    <p className="text-[9px] font-medium tracking-widest uppercase leading-none mt-0.5" style={{ color: "rgba(168,255,246,0.45)" }}>
                      Ranked Dashboard
                    </p>
                  </div>
                </SoundLink>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-all duration-200"
                  style={{ border: "1px solid rgba(0,207,255,0.2)", background: "rgba(0,207,255,0.08)", color: "rgba(0,207,255,0.6)" }}
                  title="Collapse sidebar"
                >
                  ‹
                </button>
              </>
            ) : (
              <>
                <SoundLink
                  href="/"
                  soundType="click"
                  className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-lg logo-glow"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,207,255,0.22), rgba(77,238,234,0.15))",
                    border: "1px solid rgba(0,207,255,0.35)",
                  }}
                >
                  🌊
                </SoundLink>
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full shadow-lg transition-all duration-200 text-xs"
                  style={{ border: "1px solid rgba(0,207,255,0.3)", background: "#062B45", color: "#00CFFF" }}
                  title="Expand sidebar"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            {links.map(({ label, href, emoji, live }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <div key={href} className="group relative">
                  <SoundLink
                    href={href}
                    soundType="success"
                    className={`nav-item-premium relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${sidebarCollapsed ? "justify-center" : ""} ${
                      isActive
                        ? "active border"
                        : "border border-transparent"
                    }`}
                    style={isActive ? {} : { color: "rgba(168,255,246,0.65)" }}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    {/* Active indicator bar */}
                    <span className={`nav-indicator ${isActive ? "" : "hidden"}`} />
                    {isActive && (
                      <span className="absolute inset-0 rounded-xl active-tab-glow" />
                    )}
                    <span className={`relative shrink-0 text-base leading-none transition-transform duration-250 ${isActive ? "scale-110" : "group-hover:scale-108"}`}
                      style={{ filter: isActive ? "drop-shadow(0 0 6px rgba(14,165,233,0.5))" : undefined }}>
                      {emoji}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="relative flex-1 truncate text-[13px] font-medium">{label}</span>
                    )}
                    {!sidebarCollapsed && live && (
                      <span className="relative shrink-0 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    )}
                  </SoundLink>

                  {sidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover:block z-50 pointer-events-none">
                      <div className="animate-tooltip rounded-lg bg-white border border-sky-200 px-3 py-1.5 text-xs font-bold text-gray-700 whitespace-nowrap shadow-lg"
                        style={{ boxShadow: "0 8px 24px rgba(14,165,233,0.15), 0 0 0 1px rgba(14,165,233,0.1)" }}>
                        {label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Admin section */}
            {isOwner && (
              <>
                {!sidebarCollapsed ? (
                  <div className="pt-4 pb-1.5 px-1">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,127,80,0.3), transparent)" }} />
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,127,80,0.6)" }}>Admin</p>
                      <div className="h-px flex-1" style={{ background: "linear-gradient(270deg, rgba(255,127,80,0.3), transparent)" }} />
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 pb-1 flex justify-center">
                    <div className="h-px w-8" style={{ background: "rgba(255,127,80,0.3)" }} />
                  </div>
                )}
                {adminLinks.map(({ label, href, emoji }) => {
                  const isActive = pathname === href || pathname.startsWith(href);
                  return (
                    <div key={href} className="group relative">
                      <SoundLink
                        href={href}
                        soundType="success"
                        className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-150 ${sidebarCollapsed ? "justify-center" : ""} ${
                          isActive
                            ? "border"
                            : "border border-transparent"
                        }`}
                        style={isActive
                          ? { background: "rgba(255,127,80,0.12)", color: "#FF7F50", borderColor: "rgba(255,127,80,0.3)" }
                          : { color: "rgba(255,127,80,0.6)" }}
                        title={sidebarCollapsed ? label : undefined}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full tab-indicator" style={{ background: "linear-gradient(180deg, #FF7F50, #FF8C42)", boxShadow: "0 0 6px rgba(255,127,80,0.6)" }} />
                        )}
                        <span className="relative shrink-0 text-base leading-none">{emoji}</span>
                        {!sidebarCollapsed && <span className="relative truncate text-[13px] font-medium">{label}</span>}
                      </SoundLink>

                      {sidebarCollapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block z-50 pointer-events-none">
                          <div className="rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-lg" style={{ background: "rgba(5,31,53,0.97)", border: "1px solid rgba(255,127,80,0.3)", color: "#FF7F50" }}>
                            {label}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: "rgba(5,31,53,0.97)" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </nav>

          {/* Bottom section */}
          {!sidebarCollapsed && (
            <div className="px-3 py-3 space-y-2.5" style={{ borderTop: "1px solid rgba(0,207,255,0.15)" }}>
              {user && (
                <SoundLink
                  href={`/profile/${user.id}`}
                  soundType="click"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 group"
                  style={{ border: "1px solid rgba(0,207,255,0.2)", background: "rgba(0,207,255,0.07)" }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.3), rgba(77,238,234,0.2))" }}
                  >
                    👤
                  </div>
                  <span className="flex-1 truncate text-xs font-semibold transition-colors" style={{ color: "#A8FFF6" }}>
                    {user.global_name || user.username}
                  </span>
                  <CopyButton text={user.id} size="xs" className="ml-auto shrink-0 opacity-40 hover:opacity-100" />
                </SoundLink>
              )}
              <SoundLink
                href={isOwner ? "/admin/seasons" : "/"}
                soundType="click"
                className="block rounded-xl px-3 py-2.5 transition-all duration-200"
                style={{ border: "1px solid rgba(0,207,255,0.18)", background: "rgba(0,207,255,0.06)" }}
              >
                <SeasonStatusWidget season={season} />
              </SoundLink>
            </div>
          )}
          {sidebarCollapsed && user && (
            <div className="px-2 py-3 flex justify-center" style={{ borderTop: "1px solid rgba(0,207,255,0.15)" }}>
              <SoundLink
                href={`/profile/${user.id}`}
                soundType="click"
                title="My Profile"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-base transition-all duration-200"
                style={{ border: "1px solid rgba(0,207,255,0.2)", background: "rgba(0,207,255,0.08)" }}
              >
                👤
              </SoundLink>
            </div>
          )}
        </aside>

        {/* ── Main content area ── */}
        <section className={`w-full min-w-0 transition-all duration-300 ${contentML}`}>

          <LoadingOverlay />

          {/* ── Top header ── */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 md:px-6 header-premium">
            {/* Mobile menu button */}
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm transition-all duration-200 md:hidden"
              style={{ border: "1px solid rgba(0,207,255,0.25)", background: "rgba(0,207,255,0.08)", color: "#00CFFF" }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>

            {/* Breadcrumb */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#00CFFF" }} />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "#00CFFF" }} />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-widest animated-underline" style={{ color: "#00CFFF" }}>EAS Arena</p>
              </div>
              <div className="hidden md:block h-4 w-px" style={{ background: "rgba(0,207,255,0.25)" }} />
              <p className="text-sm font-black tracking-tight" style={{ color: "rgba(168,255,246,0.8)" }}>Ranked Dashboard</p>
            </div>

            <div className="flex items-center gap-2">
              <ProfileMenu />
              <SoundToggle />
              <AuthButton initialUser={user} />
            </div>
          </header>

          {/* ── Mobile nav drawer ── */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
              <div className="absolute inset-0 backdrop-blur-sm animate-fade-in" style={{ background: "rgba(6,43,69,0.7)" }} />
              <div
                className="absolute left-0 top-0 h-full w-72 flex flex-col animate-slide-in sidebar-premium"
                style={{ boxShadow: "4px 0 40px rgba(0,0,0,0.5), 4px 0 20px rgba(0,207,255,0.08)", borderRight: "1px solid rgba(0,207,255,0.18)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(0,207,255,0.15)" }}>
                  <SoundLink href="/" soundType="click" className="text-xl font-black" style={{ color: "#e2f4ff" }} onClick={() => setMobileOpen(false)}>
                    EAS <span className="summer-text-gradient">ARENA</span>
                  </SoundLink>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
                    style={{ border: "1px solid rgba(0,207,255,0.2)", background: "rgba(0,207,255,0.08)", color: "#00CFFF" }}
                  >
                    ✕
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                  {links.map(({ label, href, emoji, live }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                    return (
                      <SoundLink
                        key={href}
                        href={href}
                        soundType="success"
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150 border ${
                          isActive ? "" : "border-transparent"
                        }`}
                        style={isActive
                          ? { background: "rgba(0,207,255,0.14)", color: "#00CFFF", borderColor: "rgba(0,207,255,0.28)" }
                          : { color: "rgba(168,255,246,0.65)" }}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="text-base">{emoji}</span>
                        <span className="flex-1 text-sm font-medium">{label}</span>
                        {live && (
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                          </span>
                        )}
                      </SoundLink>
                    );
                  })}

                  {user && (
                    <>
                      <div className="pt-4 pb-1.5 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#00CFFF" }}>Profile</p>
                      </div>
                      <SoundLink
                        href={`/profile/${user.id}`}
                        soundType="click"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150 border border-transparent"
                        style={{ color: "rgba(168,255,246,0.65)" }}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="text-base">👤</span>
                        <span className="text-sm font-medium">My Profile</span>
                      </SoundLink>
                    </>
                  )}

                  {isOwner && (
                    <>
                      <div className="pt-4 pb-1.5 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,127,80,0.7)" }}>Admin</p>
                      </div>
                      {adminLinks.map(({ label, href, emoji }) => {
                        const isActive = pathname === href || pathname.startsWith(href);
                        return (
                          <SoundLink
                            key={href}
                            href={href}
                            soundType="success"
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150 border ${
                              isActive ? "" : "border-transparent"
                            }`}
                            style={isActive
                              ? { background: "rgba(255,127,80,0.12)", color: "#FF7F50", borderColor: "rgba(255,127,80,0.3)" }
                              : { color: "rgba(255,127,80,0.6)" }}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="text-base">{emoji}</span>
                            <span className="text-sm font-medium">{label}</span>
                          </SoundLink>
                        );
                      })}
                    </>
                  )}
                </nav>

                {season && (
                  <div className="border-t border-sky-100 px-4 py-3">
                    <SeasonStatusWidget season={season} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Page content ── */}
          <PageTransition>
            <div className="w-full px-4 py-6 md:px-8 md:py-8 scroll-premium">
              {children}
            </div>
          </PageTransition>

          <footer className="px-8 py-6 mt-4" style={{ borderTop: "1px solid rgba(0,207,255,0.12)", background: "rgba(5,31,53,0.5)" }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-black">
                <span className="summer-text-gradient animate-text-shimmer">EAS Arena</span>
              </p>
              <p className="text-[11px]" style={{ color: "rgba(168,255,246,0.4)" }}>© 2026 Elevate All-Stars · All rights reserved</p>
              {/* Ocean accent line */}
              <div className="mt-1 h-px w-24 rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, rgba(0,207,255,0.5), transparent)", boxShadow: "0 0 6px rgba(0,207,255,0.3)" }} />
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
