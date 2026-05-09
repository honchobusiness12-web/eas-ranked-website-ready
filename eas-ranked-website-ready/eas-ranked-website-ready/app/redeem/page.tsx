"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

interface PremiumStatus {
  hasPremium: boolean;
  expiresAt: string | null;
  source: string | null;
}

export default function RedeemPage() {
  const [user, setUser] = useState<{ id: string; username: string; global_name: string | null } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);

  // Load current user session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null);
        setLoadingUser(false);
      })
      .catch(() => setLoadingUser(false));
  }, []);

  // Load premium status once user is known
  useEffect(() => {
    if (!user) return;
    fetch(`/api/premium/status?userId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        // Also check giveaway premium from players table
        return fetch(`/api/giveaway/status?userId=${encodeURIComponent(user.id)}`)
          .then((r2) => r2.json())
          .then((giveawayData) => {
            setPremiumStatus({
              hasPremium: data.premium || giveawayData.hasPremium,
              expiresAt: giveawayData.expiresAt ?? null,
              source: giveawayData.source ?? (data.premium ? "subscription" : null),
            });
          })
          .catch(() => {
            setPremiumStatus({
              hasPremium: data.premium,
              expiresAt: null,
              source: data.premium ? "subscription" : null,
            });
          });
      })
      .catch(() => {});
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/giveaway/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to redeem code.");
      } else {
        const expiryDate = new Date(data.premium_expires_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        setSuccess(`🎉 Premium activated until ${expiryDate}!`);
        setCode("");
        // Refresh premium status
        if (user) {
          setPremiumStatus({
            hasPremium: true,
            expiresAt: data.premium_expires_at,
            source: "giveaway_code",
          });
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const sourceLabels: Record<string, string> = {
    giveaway_code: "Giveaway Code",
    discord_role:  "Discord Role",
    subscription:  "Subscription",
    staff:         "Staff",
    owner:         "Owner",
    developer:     "Developer",
  };

  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-6xl">🎁</span>
          <h1 className="mt-4 text-4xl font-black">Redeem a Code</h1>
          <p className="mt-2 text-zinc-400">
            Enter your giveaway code below to activate Premium access.
          </p>
        </div>

        {/* Not logged in */}
        {!loadingUser && !user && (
          <div className="rounded-2xl border border-yellow-700/40 bg-yellow-950/20 p-8 text-center">
            <p className="text-2xl mb-3">🔒</p>
            <h2 className="text-xl font-black text-yellow-300">Login Required</h2>
            <p className="mt-2 text-sm text-zinc-400">
              You must be logged in with Discord to redeem a code.
            </p>
            <SoundLink
              href="/auth/login"
              soundType="success"
              className="mt-5 inline-block rounded-xl bg-[#5865F2] px-6 py-3 font-black text-white hover:bg-[#4752C4] transition"
            >
              Login with Discord →
            </SoundLink>
          </div>
        )}

        {/* Logged in */}
        {!loadingUser && user && (
          <div className="space-y-6">
            {/* Current premium status */}
            {premiumStatus && (
              <div
                className={`rounded-2xl border p-5 ${
                  premiumStatus.hasPremium
                    ? "border-yellow-700/40 bg-yellow-950/20"
                    : "border-white/10 bg-[#0d0d14]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{premiumStatus.hasPremium ? "💎" : "🔓"}</span>
                  <div>
                    <p className="font-black text-sm text-zinc-300">Current Status</p>
                    {premiumStatus.hasPremium ? (
                      <div>
                        <p className="text-yellow-300 font-bold">
                          Premium Active
                          {premiumStatus.source && (
                            <span className="ml-2 text-xs text-zinc-400 font-normal">
                              via {sourceLabels[premiumStatus.source] ?? premiumStatus.source}
                            </span>
                          )}
                        </p>
                        {premiumStatus.expiresAt && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Expires{" "}
                            {new Date(premiumStatus.expiresAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-zinc-400 text-sm">No active premium</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Redeem form */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <h2 className="mb-4 text-lg font-black">Enter Your Code</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EAS-1WEEK"
                  maxLength={64}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-black tracking-widest text-white placeholder-zinc-600 focus:border-yellow-600/60 focus:outline-none"
                  disabled={submitting}
                />

                {/* Success */}
                {success && (
                  <div className="rounded-xl border border-green-700/40 bg-green-950/20 px-4 py-3 text-sm font-bold text-green-300">
                    {success}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !code.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 py-3 font-black text-white shadow-lg shadow-yellow-900/30 hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Redeeming…" : "Redeem Code →"}
                </button>
              </form>
            </div>

            {/* Info */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5 text-sm text-zinc-400 space-y-2">
              <p className="font-bold text-zinc-300">ℹ️ How it works</p>
              <p>• Each code grants a set number of days of Premium access.</p>
              <p>• Codes can only be redeemed once per account.</p>
              <p>• If you already have active Premium, the duration will be stacked on top.</p>
              <p>• Codes may have a limited number of uses or an expiration date.</p>
            </div>

            {/* Link to subscribe */}
            <div className="text-center text-sm text-zinc-500">
              Want permanent Premium?{" "}
              <SoundLink
                href="/premium/subscribe"
                soundType="click"
                className="text-yellow-400 hover:text-yellow-300 font-bold transition"
              >
                Subscribe for $4.99/mo →
              </SoundLink>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
