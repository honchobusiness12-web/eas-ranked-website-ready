"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

export default function RedeemPage() {
  const [user, setUser] = useState<{ id: string; username: string; global_name: string | null } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setSuccess("🎉 Code redeemed successfully!");
        setCode("");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-6xl">🎁</span>
          <h1 className="mt-4 text-4xl font-black">Redeem a Code</h1>
          <p className="mt-2 text-zinc-400">
            Enter your giveaway code below to redeem your reward.
          </p>
        </div>

        {/* Not logged in */}
        {!loadingUser && !user && (
          <div className="rounded-2xl border border-purple-700/40 bg-purple-950/20 p-8 text-center">
            <p className="text-2xl mb-3">🔒</p>
            <h2 className="text-xl font-black text-purple-300">Login Required</h2>
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-black tracking-widest text-white placeholder-zinc-600 focus:border-purple-600/60 focus:outline-none"
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
                  className="w-full rounded-xl py-3 font-black text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
                >
                  {submitting ? "Redeeming…" : "Redeem Code →"}
                </button>
              </form>
            </div>

            {/* Info */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5 text-sm text-zinc-400 space-y-2">
              <p className="font-bold text-zinc-300">ℹ️ How it works</p>
              <p>• Each code can only be redeemed once per account.</p>
              <p>• Codes may have a limited number of uses or an expiration date.</p>
              <p>• Contact an admin if you have issues redeeming your code.</p>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
