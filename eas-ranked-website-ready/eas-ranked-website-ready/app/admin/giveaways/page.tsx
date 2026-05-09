"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

interface PremiumCode {
  id: string;
  code: string;
  duration_days: number;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
  redemption_count: number;
}

interface Redemption {
  id: string;
  code_id: string;
  user_id: string;
  redeemed_at: string;
  premium_expires_at: string;
}

const DURATION_OPTIONS = [
  { label: "7 days",    value: 7 },
  { label: "14 days",   value: 14 },
  { label: "30 days",   value: 30 },
  { label: "90 days",   value: 90 },
  { label: "180 days",  value: 180 },
  { label: "365 days",  value: 365 },
];

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminGiveawaysPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Create form state
  const [newCode, setNewCode] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Codes list
  const [codes, setCodes] = useState<PremiumCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Redemptions modal
  const [selectedCode, setSelectedCode] = useState<PremiumCode | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  // Disable state
  const [disabling, setDisabling] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.user) {
          setAuthChecked(true);
          return;
        }
        // Check owner status via list endpoint (403 = not owner)
        const listRes = await fetch("/api/giveaway/list");
        setIsOwner(listRes.ok);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadCodes = useCallback(async () => {
    setLoadingCodes(true);
    try {
      const res = await fetch("/api/giveaway/list");
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes ?? []);
      }
    } finally {
      setLoadingCodes(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) loadCodes();
  }, [isOwner, loadCodes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);

    try {
      const res = await fetch("/api/giveaway/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          duration_days: durationDays,
          max_uses: maxUses,
          expires_at: expiresAt || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreateMsg({ type: "success", text: `Code "${data.code.code}" created successfully!` });
        setNewCode("");
        setDurationDays(7);
        setMaxUses(1);
        setExpiresAt("");
        loadCodes();
      } else {
        setCreateMsg({ type: "error", text: data.error ?? "Failed to create code." });
      }
    } catch {
      setCreateMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setCreating(false);
    }
  }

  async function handleDisable(code: string) {
    if (!confirm(`Disable code "${code}"? Users will no longer be able to redeem it.`)) return;
    setDisabling(code);
    try {
      const res = await fetch("/api/giveaway/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        loadCodes();
      }
    } finally {
      setDisabling(null);
    }
  }

  async function handleViewRedemptions(code: PremiumCode) {
    setSelectedCode(code);
    setRedemptions([]);
    setLoadingRedemptions(true);
    try {
      const res = await fetch(`/api/giveaway/redemptions?code=${encodeURIComponent(code.code)}`);
      if (res.ok) {
        const data = await res.json();
        setRedemptions(data.redemptions ?? []);
      }
    } finally {
      setLoadingRedemptions(false);
    }
  }

  // Not yet checked
  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Checking access…</p>
        </div>
      </Shell>
    );
  }

  // Not owner
  if (!isOwner) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🚫</p>
            <h1 className="text-2xl font-black text-red-400">Access Denied</h1>
            <p className="mt-2 text-zinc-400">This page is restricted to the EAS Arena developer.</p>
            <SoundLink
              href="/"
              soundType="click"
              className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
            >
              ← Back to Dashboard
            </SoundLink>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-4xl font-black">🎁 Giveaway Code Manager</h1>
        <p className="mt-2 text-zinc-400">Create and manage Premium giveaway codes. Developer access only.</p>
      </div>

      {/* Create code form */}
      <div className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-6 mb-8">
        <h2 className="mb-5 text-xl font-black text-yellow-300">✨ Create New Code</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Code name */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Code Name
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. EAS-1WEEK"
                maxLength={64}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-yellow-600/60 focus:outline-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Duration
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-2.5 text-sm text-white focus:border-yellow-600/60 focus:outline-none"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Max uses */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Max Uses
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
                min={1}
                max={100000}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-yellow-600/60 focus:outline-none"
              />
            </div>

            {/* Expiration date */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-400">
                Code Expires At <span className="text-zinc-600 font-normal">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-yellow-600/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Feedback */}
          {createMsg && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                createMsg.type === "success"
                  ? "border-green-700/40 bg-green-950/20 text-green-300"
                  : "border-red-700/40 bg-red-950/20 text-red-300"
              }`}
            >
              {createMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={creating || !newCode.trim()}
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-2.5 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating…" : "Create Code →"}
          </button>
        </form>
      </div>

      {/* Codes table */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-black">📋 Active Codes</h2>
          <button
            onClick={loadCodes}
            disabled={loadingCodes}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {loadingCodes ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {loadingCodes && codes.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 animate-pulse">Loading codes…</div>
        ) : codes.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">
            No codes yet. Create one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Uses</th>
                  <th className="px-4 py-3 text-left">Code Expires</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                  const isFull = c.uses >= c.max_uses;
                  const statusLabel = !c.active
                    ? "Disabled"
                    : isExpired
                    ? "Expired"
                    : isFull
                    ? "Full"
                    : "Active";
                  const statusColor = !c.active || isExpired || isFull
                    ? "text-red-400 border-red-700/40 bg-red-950/20"
                    : "text-green-400 border-green-700/40 bg-green-950/20";

                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-6 py-3 font-mono font-black text-yellow-300">{c.code}</td>
                      <td className="px-4 py-3 text-zinc-300">{c.duration_days}d</td>
                      <td className="px-4 py-3">
                        <span className={c.uses >= c.max_uses ? "text-red-400" : "text-zinc-300"}>
                          {c.uses} / {c.max_uses}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{fmt(c.expires_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg border px-2 py-0.5 text-xs font-black ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{fmt(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewRedemptions(c)}
                            className="rounded-lg border border-blue-700/40 bg-blue-950/20 px-2.5 py-1 text-xs font-bold text-blue-300 hover:bg-blue-950/40 transition"
                          >
                            👥 Redemptions ({c.redemption_count})
                          </button>
                          {c.active && (
                            <button
                              onClick={() => handleDisable(c.code)}
                              disabled={disabling === c.code}
                              className="rounded-lg border border-red-700/40 bg-red-950/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                            >
                              {disabling === c.code ? "…" : "🚫 Disable"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redemptions modal */}
      {selectedCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedCode(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d0d14] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-lg font-black">
                  👥 Redemptions for{" "}
                  <span className="font-mono text-yellow-300">{selectedCode.code}</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedCode.uses} of {selectedCode.max_uses} uses
                </p>
              </div>
              <button
                onClick={() => setSelectedCode(null)}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {loadingRedemptions ? (
                <p className="text-center text-zinc-500 animate-pulse py-8">Loading redemptions…</p>
              ) : redemptions.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No redemptions yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider text-zinc-500">
                      <th className="pb-3 text-left">Discord User ID</th>
                      <th className="pb-3 text-left">Redeemed At</th>
                      <th className="pb-3 text-left">Premium Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((r) => (
                      <tr key={r.id} className="border-b border-white/5">
                        <td className="py-3 font-mono text-zinc-300">{r.user_id}</td>
                        <td className="py-3 text-zinc-400">{fmt(r.redeemed_at)}</td>
                        <td className="py-3">
                          <span
                            className={
                              new Date(r.premium_expires_at) > new Date()
                                ? "text-green-400"
                                : "text-zinc-500"
                            }
                          >
                            {fmt(r.premium_expires_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
