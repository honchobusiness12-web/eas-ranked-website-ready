"use client";

import SoundLink from "@/components/SoundLink";
import SoundToggle from "@/components/SoundToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";

const links = [
  { label: "🏠 Dashboard",    href: "/" },
  { label: "🏆 Leaderboard",  href: "/leaderboard" },
  { label: "👥 Players",      href: "/players" },
  { label: "⚔️ Compare",      href: "/compare" },
  { label: "📋 Placements",   href: "/placements" },
  { label: "🏷️ Ranks",        href: "/ranks" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <main className={`min-h-screen ${isLight ? "bg-[#f0f0f7] text-[#0f0f1a]" : "bg-[#05050b] text-white"}`}>
      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className={`fixed left-0 top-0 hidden h-screen w-64 border-r p-6 md:flex md:flex-col ${
          isLight
            ? "border-white/10 bg-[#1e1b2e] shadow-[2px_0_20px_rgba(0,0,0,0.25)]"
            : "border-white/10 bg-[#07070f]"
        }`}>
          <SoundLink
            href="/"
            soundType="click"
            className={`mb-10 block text-2xl font-black ${isLight ? "text-white" : ""}`}
          >
            EAS <span className="text-purple-400">ARENA</span>
          </SoundLink>

          <nav className="flex-1 space-y-1 text-sm">
            {links.map(({ label, href }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="success"
                className={`block rounded-xl px-4 py-3 transition ${
                  isLight
                    ? "text-purple-200 hover:bg-purple-500/25 hover:text-white"
                    : "text-zinc-400 hover:bg-purple-950/40 hover:text-white"
                }`}
              >
                {label}
              </SoundLink>
            ))}
          </nav>

          <div className={`rounded-2xl border p-4 ${
            isLight
              ? "border-purple-500/30 bg-purple-900/40"
              : "border-purple-700/50 bg-purple-950/30"
          }`}>
            <p className={`font-bold ${isLight ? "text-white" : ""}`}>Season One Live</p>
            <p className={`mt-1 text-sm ${isLight ? "text-purple-200" : "text-zinc-400"}`}>2026 Season</p>
            <div className={`mt-4 h-2 rounded-full ${isLight ? "bg-white/20" : "bg-zinc-800"}`}>
              <div className="h-2 w-2/3 rounded-full bg-purple-400" />
            </div>
            <span className="mt-3 inline-block rounded-lg bg-green-600 px-2 py-0.5 text-xs font-bold text-white">LIVE</span>
          </div>
        </aside>

        <section className="w-full md:ml-64">
          <header className={`sticky top-0 z-20 flex items-center justify-between border-b px-5 py-4 backdrop-blur md:px-8 ${
            isLight
              ? "border-black/8 bg-white/97 shadow-[0_1px_0_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.05)]"
              : "border-white/10 bg-[#05050b]/80"
          }`}>
            {/* Mobile menu button */}
            <button
              className={`mr-3 flex h-9 w-9 items-center justify-center rounded-xl border text-lg md:hidden transition ${
                isLight
                  ? "border-black/12 bg-black/5 text-[#0f0f1a] hover:border-purple-600 hover:bg-purple-50"
                  : "border-white/10 bg-white/5 hover:border-purple-600 hover:bg-purple-950/40"
              }`}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>

            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-purple-500">Elevate All-Stars</p>
              <p className={`text-lg font-black ${isLight ? "text-[#0f0f1a]" : "text-white"}`}>Ranked Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SoundToggle />
              <SoundLink
                href="/leaderboard"
                soundType="success"
                className="hidden rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500 sm:block"
              >
                Leaderboard
              </SoundLink>
            </div>
          </header>

          {/* Mobile nav drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileOpen(false)}>
              <div
                className={`absolute left-0 top-0 h-full w-64 border-r p-6 shadow-2xl ${
                  isLight
                    ? "border-white/10 bg-[#1e1b2e]"
                    : "border-white/10 bg-[#07070f]"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <SoundLink
                  href="/"
                  soundType="click"
                  className="mb-8 block text-2xl font-black text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  EAS <span className="text-purple-400">ARENA</span>
                </SoundLink>
                <nav className="space-y-1 text-sm">
                  {links.map(({ label, href }) => (
                    <SoundLink
                      key={href}
                      href={href}
                      soundType="success"
                      className={`block rounded-xl px-4 py-3 transition ${
                        isLight
                          ? "text-purple-200 hover:bg-purple-500/25 hover:text-white"
                          : "text-zinc-400 hover:bg-purple-950/40 hover:text-white"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </SoundLink>
                  ))}
                </nav>
              </div>
            </div>
          )}

          <div className="p-5 md:p-8 animate-fade-in">{children}</div>

          <footer className={`mx-5 mt-10 border-t py-6 text-center text-sm md:mx-8 ${
            isLight
              ? "border-black/10 text-[#7070a0]"
              : "border-white/10 text-zinc-500"
          }`}>
            © 2026 EAS Arena. All rights reserved.
          </footer>
        </section>
      </div>
    </main>
  );
}
