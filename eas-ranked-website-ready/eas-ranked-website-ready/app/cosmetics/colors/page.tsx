"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import { GRADIENT_PRESETS, USERNAME_COLORS } from "@/lib/cosmetic-constants";

export default function ColorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  const [selectedGradient, setSelectedGradient] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [savingGradient, setSavingGradient] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [gradientMsg, setGradientMsg] = useState("");
  const [colorMsg, setColorMsg] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (!meData.user) {
          router.replace("/auth/login");
          return;
        }

        const uid: string = meData.user.id;
        setUserId(uid);

        const cosRes = await fetch(`/api/cosmetics/${uid}`, { cache: "no-store" });
        const cosData = await cosRes.json();

        if (cosData.cosmetics) {
          setSelectedGradient(cosData.cosmetics.badge_gradient ?? null);
          setSelectedColor(cosData.cosmetics.username_color ?? null);
        }
      } catch {
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  async function handleSaveGradient() {
    if (!selectedGradient) return;
    setSavingGradient(true);
    setGradientMsg("");
    try {
      const res = await fetch("/api/cosmetics/gradient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, gradientId: selectedGradient }),
      });
      const data = await res.json();
      setGradientMsg(data.success ? "✅ Gradient saved!" : `❌ ${data.error ?? "Failed to save."}`);
    } catch {
      setGradientMsg("❌ An error occurred.");
    } finally {
      setSavingGradient(false);
    }
  }

  async function handleSaveColor() {
    if (!selectedColor) return;
    setSavingColor(true);
    setColorMsg("");
    try {
      const res = await fetch("/api/cosmetics/username-color", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, colorId: selectedColor }),
      });
      const data = await res.json();
      setColorMsg(data.success ? "✅ Color saved!" : `❌ ${data.error ?? "Failed to save."}`);
    } catch {
      setColorMsg("❌ An error occurred.");
    } finally {
      setSavingColor(false);
    }
  }

  const activeGradient = GRADIENT_PRESETS.find((g) => g.id === selectedGradient);
  const activeColor = USERNAME_COLORS.find((c) => c.id === selectedColor);

  if (loading) {
    return (
      <Shell>
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-zinc-400 animate-pulse">Loading your color settings…</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🎨 Color Customization</h1>
          <p className="mt-2 text-zinc-400">
            Personalize your rank badge gradient and username color.
          </p>
        </div>
        <SoundLink
          href={`/profile/${userId}`}
          soundType="click"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-white/5 transition"
        >
          ← My Profile
        </SoundLink>
      </div>

      {/* Account info */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4 mb-6 flex items-center gap-3">
        <span className="text-lg">🔒</span>
        <p className="text-sm text-zinc-400">
          Editing colors for your account.{" "}
          <span className="text-zinc-500 font-mono text-xs">(ID: {userId})</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* ── Gradient Section ── */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-1 text-xl font-black">🌈 Badge Gradient</h2>
            <p className="mb-5 text-sm text-zinc-400">
              Choose a gradient for your rank badge background.
              {selectedGradient && (
                <span className="ml-2 text-purple-400 font-bold">
                  Current: {GRADIENT_PRESETS.find((g) => g.id === selectedGradient)?.label}
                </span>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedGradient(preset.id)}
                  className={`relative rounded-xl border p-3 text-left transition ${
                    selectedGradient === preset.id
                      ? "border-purple-500 bg-purple-950/20"
                      : "border-white/10 bg-white/5 hover:border-purple-600/40"
                  }`}
                >
                  <div
                    className="mb-2 h-8 w-full rounded-lg"
                    style={{ background: preset.css }}
                  />
                  <p className="text-xs font-bold text-center leading-tight">{preset.label}</p>
                  {selectedGradient === preset.id && (
                    <span className="absolute right-2 top-2 text-purple-400 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={handleSaveGradient}
                disabled={savingGradient || !selectedGradient}
                className="rounded-xl px-6 py-2.5 font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
              >
                {savingGradient ? "Saving…" : "💾 Save Gradient"}
              </button>
              {gradientMsg && (
                <p className={`text-sm font-bold ${gradientMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
                  {gradientMsg}
                </p>
              )}
            </div>
          </div>

          {/* ── Username Color Section ── */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-1 text-xl font-black">✏️ Username Color</h2>
            <p className="mb-5 text-sm text-zinc-400">
              Choose a color for your username display.
              {selectedColor && (
                <span className="ml-2 font-bold" style={{ color: USERNAME_COLORS.find((c) => c.id === selectedColor)?.hex }}>
                  Current: {USERNAME_COLORS.find((c) => c.id === selectedColor)?.label}
                </span>
              )}
            </p>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-12">
              {USERNAME_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  title={color.label}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                    selectedColor === color.id
                      ? "border-white bg-white/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <div
                    className="h-8 w-8 rounded-full border border-white/20"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-[10px] font-bold text-zinc-400">{color.label}</span>
                  {selectedColor === color.id && (
                    <span className="absolute right-1 top-1 text-white text-[10px]">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={handleSaveColor}
                disabled={savingColor || !selectedColor}
                className="rounded-xl px-6 py-2.5 font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
              >
                {savingColor ? "Saving…" : "💾 Save Color"}
              </button>
              {colorMsg && (
                <p className={`text-sm font-bold ${colorMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
                  {colorMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Live Preview ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-700/30 bg-purple-950/10 p-5 sticky top-24">
            <h3 className="mb-4 text-lg font-black">👁️ Live Preview</h3>

            {/* Badge preview */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">Rank Badge</p>
              <div className="flex items-center gap-3">
                {activeGradient ? (
                  <span
                    className="inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold gap-1.5"
                    style={{
                      background: activeGradient.css,
                      borderColor: `${activeGradient.to}60`,
                      color: "#fff",
                    }}
                  >
                    🌟 R5 All-Star High
                  </span>
                ) : (
                  <RankBadge cr={1500} size="md" />
                )}
              </div>
              {activeGradient && (
                <p className="mt-1.5 text-xs text-zinc-500">{activeGradient.label}</p>
              )}
            </div>

            {/* Username preview */}
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">Username</p>
              <p
                className="text-lg font-black"
                style={{ color: activeColor?.hex ?? "#ffffff" }}
              >
                YourUsername
              </p>
              {activeColor && (
                <p className="mt-1 text-xs text-zinc-500">{activeColor.label}</p>
              )}
            </div>

            {/* Profile card preview */}
            <div
              className="mt-5 rounded-xl border p-4"
              style={{
                borderColor: activeColor ? `${activeColor.hex}40` : "rgba(255,255,255,0.1)",
                background: activeColor
                  ? `linear-gradient(135deg, #0d0d14, ${activeColor.hex}10)`
                  : "#0d0d14",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-black text-sm"
                  style={{ backgroundColor: activeColor?.hex ?? "#7C3AED" }}
                >
                  P
                </div>
                <div>
                  <p
                    className="font-black text-sm"
                    style={{ color: activeColor?.hex ?? "#ffffff" }}
                  >
                    YourUsername
                  </p>
                  <p className="text-xs text-zinc-500">1,500 CR</p>
                </div>
              </div>
              <div className="mt-3">
                {activeGradient ? (
                  <span
                    className="inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold gap-1.5"
                    style={{
                      background: activeGradient.css,
                      borderColor: `${activeGradient.to}60`,
                      color: "#fff",
                    }}
                  >
                    🌟 R5 All-Star High
                  </span>
                ) : (
                  <RankBadge cr={1500} size="sm" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
