"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import {
  THEMES,
  RANK_BADGE_STYLES,
  ACHIEVEMENT_FRAMES,
  PROFILE_COLORS,
} from "@/lib/premium-constants";

interface Subscription {
  subscription_status: string | null;
  current_period_end: string | null;
  source: string | null;
}

interface Cosmetics {
  theme: string | null;
  profile_banner: string | null;
  rank_badge_style: string | null;
  player_title: string | null;
  profile_color: string | null;
  achievement_frame: string | null;
}

export default function ManagePage() {
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [cosmetics, setCosmetics] = useState<Cosmetics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadData(uid: string) {
    setLoading(true);
    setError("");
    try {
      const [subRes, cosRes] = await Promise.all([
        fetch(`/api/premium/subscription?userId=${uid}`),
        fetch(`/api/premium/cosmetics?userId=${uid}`),
      ]);
      const subData = await subRes.json();
      const cosData = await cosRes.json();
      setSubscription(subData.subscription ?? null);
      setCosmetics(cosData.cosmetics ?? null);
    } catch {
      setError("Failed to load subscription data.");
    } finally {
      setLoading(false);
    }
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    setUserId(inputId.trim());
    loadData(inputId.trim());
  }

  const sourceLabel: Record<string, string> = {
    developer:     "👑 Developer",
    discord_role:  "☕ Buy Me a Coffee / Stripe",
    giveaway_code: "🎁 Giveaway / Manual Grant",
  };

  const isActive = !!subscription;

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-4xl font-black">💎 Manage Subscription</h1>
        <p className="mt-2 text-zinc-400">View and manage your EAS Arena Premium membership.</p>
      </div>

      {/* User ID lookup */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
        <h2 className="mb-4 text-lg font-black">🔍 Look Up Your Subscription</h2>
        <p className="mb-4 text-sm text-zinc-400">Enter your Discord User ID to view your subscription status.</p>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="Discord User ID (e.g. 123456789012345678)"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-yellow-600/60 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            Look Up
          </button>
        </form>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-zinc-400 animate-pulse">Loading subscription data…</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {!loading && userId && !subscription && !error && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-10 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h2 className="text-xl font-black text-zinc-300">No Subscription Found</h2>
          <p className="mt-2 text-sm text-zinc-500">This Discord ID doesn&apos;t have an active premium subscription.</p>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="mt-5 inline-block rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            Get Premium →
          </SoundLink>
        </div>
      )}

      {!loading && subscription && (
        <div className="space-y-6">
          {/* Status card */}
          <div className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl font-black">Premium Status</h2>
                  {isActive && <PremiumBadge size="md" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400 w-36">Status</span>
                    <span className="rounded-lg border border-green-700/40 bg-green-950/20 px-3 py-1 text-xs font-black uppercase text-green-400">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400 w-36">Source</span>
                    <span className="text-sm font-bold text-white">
                      {sourceLabel[subscription.source ?? ""] ?? subscription.source ?? "—"}
                    </span>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 w-36">Expires</span>
                      <span className="text-sm font-bold text-white">
                        {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400 w-36">Price</span>
                    <span className="text-sm font-bold text-yellow-300">$4.99 / month via Buy Me a Coffee</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <SoundLink
                  href="/premium/cosmetics"
                  soundType="success"
                  className="rounded-xl border border-yellow-600/50 px-4 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-950/30 transition text-center"
                >
                  🎨 Manage Cosmetics
                </SoundLink>
                <SoundLink
                  href="/premium/stats"
                  soundType="success"
                  className="rounded-xl border border-teal-600/50 px-4 py-2 text-sm font-bold text-teal-300 hover:bg-teal-950/30 transition text-center"
                >
                  📊 Advanced Stats
                </SoundLink>
              </div>
            </div>
          </div>

          {/* Active cosmetics */}
          {cosmetics && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">🎨 Active Cosmetics</h2>
                <SoundLink
                  href="/premium/cosmetics"
                  soundType="click"
                  className="text-sm text-yellow-400 hover:text-yellow-300 font-bold transition"
                >
                  Edit →
                </SoundLink>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {/* Theme */}
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-zinc-500">Theme</p>
                  <p className="mt-1 font-bold text-sm text-white">
                    {THEMES.find((t) => t.id === cosmetics.theme)?.icon}{" "}
                    {cosmetics.theme || "Default"}
                  </p>
                </div>
                {/* Badge Style */}
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-zinc-500">Badge Style</p>
                  <p className="mt-1 font-bold text-sm text-white">
                    {RANK_BADGE_STYLES.find((b) => b.id === cosmetics.rank_badge_style)?.icon}{" "}
                    {cosmetics.rank_badge_style || "Default"}
                  </p>
                </div>
                {/* Player Title */}
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-zinc-500">Player Title</p>
                  <p className="mt-1 font-bold text-sm text-white">
                    {cosmetics.player_title || "None"}
                  </p>
                </div>
                {/* Achievement Frame */}
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-zinc-500">Achievement Frame</p>
                  <p className="mt-1 font-bold text-sm text-white">
                    {ACHIEVEMENT_FRAMES.find((f) => f.id === cosmetics.achievement_frame)?.icon}{" "}
                    {cosmetics.achievement_frame || "Default"}
                  </p>
                </div>
                {/* Profile Color */}
                {cosmetics.profile_color && (
                  <div className="rounded-xl bg-white/5 p-3 flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full border border-white/20 shrink-0 flex items-center justify-center text-sm"
                      style={{ backgroundColor: cosmetics.profile_color }}
                    >
                      {PROFILE_COLORS.find((c) => c.id === cosmetics.profile_color)?.icon}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Profile Color</p>
                      <p className="font-bold text-sm text-white">
                        {PROFILE_COLORS.find((c) => c.id === cosmetics.profile_color)?.label || cosmetics.profile_color}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Premium features quick links */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">⚡ Premium Features</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { href: "/premium/stats", icon: "📊", label: "Advanced Stats" },
                { href: "/premium/comparisons", icon: "⚔️", label: "Comparison History" },
                { href: "/premium/cosmetics", icon: "🎨", label: "Cosmetics" },
                { href: "/premium/export", icon: "📥", label: "Export Stats" },
                { href: "/premium/matches", icon: "📜", label: "Match History" },
                { href: "/premium/tracker", icon: "🎯", label: "Progress Tracker" },
              ].map(({ href, icon, label }) => (
                <SoundLink
                  key={href}
                  href={href}
                  soundType="click"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:border-yellow-600/40 hover:bg-yellow-950/10 transition"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </SoundLink>
              ))}
            </div>
          </div>

          {/* How to cancel Buy Me a Coffee */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-2 text-lg font-black text-zinc-300">☕ Managing Your Subscription</h2>
            <p className="text-sm text-zinc-400 mb-3">
              Your premium is powered by Buy Me a Coffee (Stripe). To cancel or manage your
              membership, visit your Buy Me a Coffee account directly.
            </p>
            <a
              href="https://www.buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl border border-yellow-600/40 bg-yellow-950/20 px-5 py-2.5 text-sm font-bold text-yellow-300 hover:bg-yellow-950/40 transition"
            >
              Manage on Buy Me a Coffee →
            </a>
          </div>
        </div>
      )}
    </Shell>
  );
}
