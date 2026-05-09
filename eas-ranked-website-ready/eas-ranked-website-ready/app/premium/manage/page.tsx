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
  id: string;
  user_id: string;
  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
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
  const [canceling, setCanceling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");
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

  async function handleCancel() {
    if (!userId) return;
    if (!confirm("Are you sure you want to cancel your Premium subscription?")) return;
    setCanceling(true);
    setCancelMsg("");
    try {
      const res = await fetch("/api/premium/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setCancelMsg("Subscription canceled. You retain access until the end of your billing period.");
        loadData(userId);
      } else {
        setCancelMsg(data.error || "Failed to cancel subscription.");
      }
    } catch {
      setCancelMsg("An error occurred. Please try again.");
    } finally {
      setCanceling(false);
    }
  }

  const statusColor: Record<string, string> = {
    active: "text-green-400 border-green-700/40 bg-green-950/20",
    canceled: "text-red-400 border-red-700/40 bg-red-950/20",
    past_due: "text-yellow-400 border-yellow-700/40 bg-yellow-950/20",
    expired: "text-zinc-400 border-zinc-700/40 bg-zinc-950/20",
  };

  const isActive = subscription?.subscription_status === "active";

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
                  <h2 className="text-2xl font-black">Subscription Status</h2>
                  {isActive && <PremiumBadge size="md" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400 w-36">Status</span>
                    <span
                      className={`rounded-lg border px-3 py-1 text-xs font-black uppercase ${
                        statusColor[subscription.subscription_status ?? ""] || "text-zinc-400 border-zinc-700/40 bg-zinc-950/20"
                      }`}
                    >
                      {subscription.subscription_status || "Unknown"}
                    </span>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 w-36">
                        {isActive ? "Renews on" : "Access until"}
                      </span>
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
                    <span className="text-sm text-zinc-400 w-36">Member since</span>
                    <span className="text-sm font-bold text-white">
                      {new Date(subscription.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400 w-36">Price</span>
                    <span className="text-sm font-bold text-yellow-300">$4.99 / month</span>
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

          {/* Cancel */}
          {isActive && (
            <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
              <h2 className="mb-2 text-lg font-black text-red-400">⚠️ Cancel Subscription</h2>
              <p className="text-sm text-zinc-400 mb-4">
                Canceling will end your premium access at the end of the current billing period. You won&apos;t be charged again.
              </p>
              {cancelMsg && (
                <div className="mb-4 rounded-xl border border-yellow-700/40 bg-yellow-950/20 p-3 text-sm text-yellow-300">
                  {cancelMsg}
                </div>
              )}
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="rounded-xl border border-red-700/50 bg-red-950/30 px-5 py-2.5 text-sm font-bold text-red-400 hover:bg-red-950/50 transition disabled:opacity-50"
              >
                {canceling ? "Canceling…" : "Cancel Subscription"}
              </button>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
