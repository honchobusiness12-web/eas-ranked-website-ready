"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import {
  THEMES,
  RANK_BADGE_STYLES,
  PLAYER_TITLES,
  PROFILE_COLORS,
  ACHIEVEMENT_FRAMES,
  GRADIENT_PRESETS,
  BANNER_COLORS,
  BANNER_PATTERNS,
  PROFILE_EFFECTS,
  buildGradientCSS,
} from "@/lib/premium-constants";

interface CosmeticsState {
  theme: string;
  rank_badge_style: string;
  player_title: string;
  profile_color: string;
  achievement_frame: string;
  gradient_preset: string;
  banner_color: string;
  banner_pattern: string;
  profile_effect: string;
}

const DEFAULT_COSMETICS: CosmeticsState = {
  theme: "dark",
  rank_badge_style: "default",
  player_title: "",
  profile_color: "#FF6B6B",
  achievement_frame: "default",
  gradient_preset: "none",
  banner_color: "default",
  banner_pattern: "none",
  profile_effect: "none",
};

export default function CosmeticsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cosmetics, setCosmetics] = useState<CosmeticsState>(DEFAULT_COSMETICS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"themes" | "badges" | "titles" | "colors" | "frames" | "gradient" | "banner" | "effects">("themes");

  // On mount: fetch the logged-in user from session, then load their cosmetics
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // 1. Get the current session user
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (!meData.user) {
          // Not logged in — redirect to login
          router.replace("/auth/login");
          return;
        }

        const uid: string = meData.user.id;
        setUserId(uid);

        // 2. Load premium status and existing cosmetics for this user
        const [statusRes, cosRes] = await Promise.all([
          fetch(`/api/premium/status?userId=${uid}`),
          fetch(`/api/premium/cosmetics?userId=${uid}`),
        ]);
        const statusData = await statusRes.json();
        const cosData = await cosRes.json();

        setIsPremium(statusData.premium ?? false);

        if (cosData.cosmetics) {
          setCosmetics({
            theme: cosData.cosmetics.theme || "dark",
            rank_badge_style: cosData.cosmetics.rank_badge_style || "default",
            player_title: cosData.cosmetics.player_title || "",
            profile_color: cosData.cosmetics.profile_color || "#FF6B6B",
            achievement_frame: cosData.cosmetics.achievement_frame || "default",
            gradient_preset: cosData.cosmetics.gradient_preset || "none",
            banner_color: cosData.cosmetics.banner_color || "default",
            banner_pattern: cosData.cosmetics.banner_pattern || "none",
            profile_effect: cosData.cosmetics.profile_effect || "none",
          });
        }
      } catch {
        // On error, redirect to login as a safe fallback
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  async function handleSave() {
    if (!userId || !isPremium) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/premium/cosmetics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...cosmetics }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setSaveMsg("❌ " + (data.error || "You can only edit your own cosmetics."));
      } else {
        setSaveMsg(data.success ? "✅ Cosmetics saved successfully!" : data.error || "Failed to save.");
      }
    } catch {
      setSaveMsg("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: "themes" as const,   label: "🎨 Themes" },
    { id: "badges" as const,   label: "🏅 Rank Badges" },
    { id: "titles" as const,   label: "📛 Titles" },
    { id: "colors" as const,   label: "🎨 Colors" },
    { id: "frames" as const,   label: "🖼️ Frames" },
    { id: "gradient" as const, label: "🌈 Gradient" },
    { id: "banner" as const,   label: "🖼 Banner" },
    { id: "effects" as const,  label: "✨ Effects" },
  ];

  // Show a loading state while we verify the session
  if (loading) {
    return (
      <Shell>
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-zinc-400 animate-pulse">Loading your cosmetics…</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🎨 Cosmetics Selector</h1>
          <p className="mt-2 text-zinc-400">Personalise your EAS Arena profile. Premium members only.</p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* Logged-in user info */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4 mb-6 flex items-center gap-3">
        <span className="text-lg">🔒</span>
        <p className="text-sm text-zinc-400">
          Editing cosmetics for your account.{" "}
          <span className="text-zinc-500 font-mono text-xs">(ID: {userId})</span>
        </p>
        <p className="ml-auto text-xs text-zinc-600">You can only edit your own cosmetics.</p>
      </div>

      {!isPremium && (
        <div className="rounded-2xl border border-yellow-700/40 bg-gradient-to-br from-yellow-950/30 to-black p-8 text-center mb-6">
          <span className="text-5xl">💎</span>
          <h2 className="mt-4 text-2xl font-black text-yellow-300">Premium Required</h2>
          <p className="mt-2 text-zinc-400">Cosmetics are exclusive to Premium members.</p>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="mt-5 inline-block rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-3 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            Upgrade to Premium →
          </SoundLink>
        </div>
      )}

      {isPremium && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Selector panel */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? "border-yellow-500 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:border-yellow-600/40 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Themes */}
            {activeTab === "themes" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h3 className="mb-4 text-lg font-black">Choose Theme</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => theme.available && setCosmetics((c) => ({ ...c, theme: theme.id }))}
                      disabled={!theme.available}
                      className={`relative rounded-xl border p-4 text-left transition ${
                        cosmetics.theme === theme.id
                          ? "border-yellow-500 bg-yellow-950/20"
                          : theme.available
                          ? "border-white/10 bg-white/5 hover:border-yellow-600/40"
                          : "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className="mb-2 h-10 w-full rounded-lg border border-white/10 flex items-center justify-center"
                        style={{ backgroundColor: theme.preview }}
                      >
                        <span className="text-xl drop-shadow">{theme.icon}</span>
                      </div>
                      <p className="font-bold text-sm">{theme.icon} {theme.label}</p>
                      {!theme.available && (
                        <span className="absolute right-2 top-2 rounded-md bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                          Soon
                        </span>
                      )}
                      {cosmetics.theme === theme.id && (
                        <span className="absolute right-2 top-2 text-yellow-400 text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rank badge styles */}
            {activeTab === "badges" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h3 className="mb-4 text-lg font-black">Rank Badge Style</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {RANK_BADGE_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => style.available && setCosmetics((c) => ({ ...c, rank_badge_style: style.id }))}
                      disabled={!style.available}
                      className={`relative rounded-xl border p-4 text-left transition ${
                        cosmetics.rank_badge_style === style.id
                          ? "border-yellow-500 bg-yellow-950/20"
                          : style.available
                          ? "border-white/10 bg-white/5 hover:border-yellow-600/40"
                          : "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-center h-10">
                        <span
                          className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold gap-1.5 ${
                            style.id === "glowing"
                              ? "border-orange-500/60 bg-orange-500/18 text-orange-400"
                              : style.id === "pulsing"
                              ? "border-yellow-500/60 bg-yellow-500/18 text-yellow-400 animate-pulse"
                              : style.id === "gradient"
                              ? "border-transparent text-white"
                              : "border-orange-500/60 bg-orange-500/18 text-orange-400"
                          }`}
                          style={
                            style.id === "gradient"
                              ? { background: "linear-gradient(90deg, #FF6B6B, #FF9F43)", border: "none" }
                              : style.id === "glowing"
                              ? { boxShadow: "0 0 8px rgba(249,115,22,0.5)" }
                              : {}
                          }
                        >
                          {style.icon} All-Star
                        </span>
                      </div>
                      <p className="font-bold text-sm text-center">{style.icon} {style.label}</p>
                      {!style.available && (
                        <span className="absolute right-2 top-2 rounded-md bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                          Soon
                        </span>
                      )}
                      {cosmetics.rank_badge_style === style.id && (
                        <span className="absolute right-2 top-2 text-yellow-400 text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Player titles */}
            {activeTab === "titles" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h3 className="mb-4 text-lg font-black">Player Title</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    onClick={() => setCosmetics((c) => ({ ...c, player_title: "" }))}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      cosmetics.player_title === ""
                        ? "border-yellow-500 bg-yellow-950/20 text-yellow-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-yellow-600/40 hover:text-white"
                    }`}
                  >
                    None
                  </button>
                  {PLAYER_TITLES.map((title) => (
                    <button
                      key={title}
                      onClick={() => setCosmetics((c) => ({ ...c, player_title: title }))}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                        cosmetics.player_title === title
                          ? "border-yellow-500 bg-yellow-950/20 text-yellow-300"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:border-yellow-600/40 hover:text-white"
                      }`}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Profile colors */}
            {activeTab === "colors" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h3 className="mb-4 text-lg font-black">Profile Accent Color</h3>
                <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
                  {PROFILE_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setCosmetics((c) => ({ ...c, profile_color: color.id }))}
                      title={color.label}
                      className={`relative h-10 w-10 rounded-full border-2 transition hover:scale-110 ${
                        cosmetics.profile_color === color.id
                          ? "border-white scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.id }}
                    >
                      {cosmetics.profile_color === color.id && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  Selected: <span className="font-bold" style={{ color: cosmetics.profile_color }}>{cosmetics.profile_color}</span>
                </p>
              </div>
            )}

            {/* Achievement frames */}
            {activeTab === "frames" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h3 className="mb-4 text-lg font-black">Achievement Frame</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ACHIEVEMENT_FRAMES.map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => frame.available && setCosmetics((c) => ({ ...c, achievement_frame: frame.id }))}
                      disabled={!frame.available}
                      className={`relative rounded-xl border p-4 text-left transition ${
                        cosmetics.achievement_frame === frame.id
                          ? "border-yellow-500 bg-yellow-950/20"
                          : frame.available
                          ? "border-white/10 bg-white/5 hover:border-yellow-600/40"
                          : "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-center h-12">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-xl"
                          style={{
                            border: frame.id === "gold"
                              ? "2px solid #FFD700"
                              : frame.id === "diamond"
                              ? "2px solid #00D4FF"
                              : frame.id === "fire"
                              ? "2px solid #FF4500"
                              : frame.id === "ice"
                              ? "2px solid #87CEEB"
                              : "2px solid #6b7280",
                            boxShadow: frame.id === "gold"
                              ? "0 0 8px rgba(255,215,0,0.4)"
                              : frame.id === "diamond"
                              ? "0 0 8px rgba(0,212,255,0.4)"
                              : frame.id === "fire"
                              ? "0 0 8px rgba(255,69,0,0.4)"
                              : frame.id === "ice"
                              ? "0 0 8px rgba(135,206,235,0.4)"
                              : "none",
                          }}
                        >
                          {frame.icon}
                        </div>
                      </div>
                      <p className="font-bold text-sm text-center">{frame.icon} {frame.label}</p>
                      {!frame.available && (
                        <span className="absolute right-2 top-2 rounded-md bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                          Soon
                        </span>
                      )}
                      {cosmetics.achievement_frame === frame.id && (
                        <span className="absolute right-2 top-2 text-yellow-400 text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gradient presets */}
            {activeTab === "gradient" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h3 className="mb-4 text-lg font-black">🌈 Gradient Preset</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Applies a gradient to your rank badge, profile accent, and banner.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {GRADIENT_PRESETS.map((preset) => {
                    const gradientCSS = buildGradientCSS(preset.id);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setCosmetics((c) => ({ ...c, gradient_preset: preset.id }))}
                        className={`relative rounded-xl border p-4 text-left transition ${
                          cosmetics.gradient_preset === preset.id
                            ? "border-yellow-500 bg-yellow-950/20"
                            : "border-white/10 bg-white/5 hover:border-yellow-600/40"
                        }`}
                      >
                        <div
                          className="mb-2 h-8 w-full rounded-lg"
                          style={{
                            background: gradientCSS ?? "#3f3f46",
                          }}
                        />
                        <p className="font-bold text-sm">{preset.label}</p>
                        {cosmetics.gradient_preset === preset.id && (
                          <span className="absolute right-2 top-2 text-yellow-400 text-sm">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Banner customization */}
            {activeTab === "banner" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                  <h3 className="mb-4 text-lg font-black">🖼 Banner Color / Gradient</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {BANNER_COLORS.map((banner) => (
                      <button
                        key={banner.id}
                        onClick={() => setCosmetics((c) => ({ ...c, banner_color: banner.id }))}
                        className={`relative rounded-xl border p-4 text-left transition ${
                          cosmetics.banner_color === banner.id
                            ? "border-yellow-500 bg-yellow-950/20"
                            : "border-white/10 bg-white/5 hover:border-yellow-600/40"
                        }`}
                      >
                        <div
                          className="mb-2 h-8 w-full rounded-lg border border-white/10"
                          style={{
                            background: banner.gradient ?? (banner.color ? banner.color + "40" : "#1a1a2e"),
                          }}
                        />
                        <p className="font-bold text-sm">{banner.label}</p>
                        {cosmetics.banner_color === banner.id && (
                          <span className="absolute right-2 top-2 text-yellow-400 text-sm">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                  <h3 className="mb-4 text-lg font-black">🔲 Banner Pattern</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {BANNER_PATTERNS.map((pattern) => (
                      <button
                        key={pattern.id}
                        onClick={() => pattern.available && setCosmetics((c) => ({ ...c, banner_pattern: pattern.id }))}
                        disabled={!pattern.available}
                        className={`relative rounded-xl border p-4 text-left transition ${
                          cosmetics.banner_pattern === pattern.id
                            ? "border-yellow-500 bg-yellow-950/20"
                            : pattern.available
                            ? "border-white/10 bg-white/5 hover:border-yellow-600/40"
                            : "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-center h-8 text-2xl">
                          {pattern.icon}
                        </div>
                        <p className="font-bold text-sm text-center">{pattern.label}</p>
                        {!pattern.available && (
                          <span className="absolute right-2 top-2 rounded-md bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                            Soon
                          </span>
                        )}
                        {cosmetics.banner_pattern === pattern.id && (
                          <span className="absolute right-2 top-2 text-yellow-400 text-sm">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Profile effects */}
            {activeTab === "effects" && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h3 className="mb-4 text-lg font-black">✨ Profile Effects</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Animated effects that appear on your profile. More coming soon!
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PROFILE_EFFECTS.map((effect) => (
                    <button
                      key={effect.id}
                      onClick={() => effect.available && setCosmetics((c) => ({ ...c, profile_effect: effect.id }))}
                      disabled={!effect.available}
                      className={`relative rounded-xl border p-4 text-left transition ${
                        cosmetics.profile_effect === effect.id
                          ? "border-yellow-500 bg-yellow-950/20"
                          : effect.available
                          ? "border-white/10 bg-white/5 hover:border-yellow-600/40"
                          : "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-center h-10 text-3xl">
                        {effect.icon}
                      </div>
                      <p className="font-bold text-sm text-center">{effect.label}</p>
                      {!effect.available && (
                        <span className="absolute right-2 top-2 rounded-md bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                          Soon
                        </span>
                      )}
                      {cosmetics.profile_effect === effect.id && (
                        <span className="absolute right-2 top-2 text-yellow-400 text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-3 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50"
              >
                {saving ? "Saving…" : "💾 Save Cosmetics"}
              </button>
              {saveMsg && (
                <p className={`text-sm font-bold ${saveMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
                  {saveMsg}
                </p>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-5 sticky top-24">
              <h3 className="mb-4 text-lg font-black">👁️ Live Preview</h3>

              {/* Profile card preview */}
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: `${cosmetics.profile_color}40`,
                  background: (() => {
                    const bannerOpt = BANNER_COLORS.find((b) => b.id === cosmetics.banner_color);
                    if (bannerOpt?.gradient) return bannerOpt.gradient;
                    if (bannerOpt?.color) return `linear-gradient(135deg, #0d0d14, ${bannerOpt.color}30)`;
                    const gradCSS = buildGradientCSS(cosmetics.gradient_preset, "135deg");
                    if (gradCSS) return gradCSS.replace(")", ", #0d0d14)").replace("linear-gradient(135deg,", "linear-gradient(135deg, #0d0d14,");
                    return `linear-gradient(135deg, #0d0d14, ${cosmetics.profile_color}10)`;
                  })(),
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center font-black text-lg"
                    style={{ backgroundColor: cosmetics.profile_color }}
                  >
                    P
                  </div>
                  <div>
                    <p className="font-black">Your Name</p>
                    {cosmetics.player_title && (
                      <p className="text-xs font-bold" style={{ color: cosmetics.profile_color }}>
                        {cosmetics.player_title}
                      </p>
                    )}
                  </div>
                  <PremiumBadge size="sm" className="ml-auto" />
                </div>

                {/* Rank badge preview */}
                <div className="mb-3">
                  <span
                    className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold gap-1.5 ${
                      cosmetics.rank_badge_style === "pulsing" ? "animate-pulse" : ""
                    }`}
                    style={{
                      borderColor: `${cosmetics.profile_color}60`,
                      backgroundColor: `${cosmetics.profile_color}18`,
                      color: cosmetics.rank_badge_style === "gradient" || buildGradientCSS(cosmetics.gradient_preset) ? "#fff" : cosmetics.profile_color,
                      boxShadow:
                        cosmetics.rank_badge_style === "glowing"
                          ? `0 0 10px ${cosmetics.profile_color}50`
                          : "none",
                      background:
                        buildGradientCSS(cosmetics.gradient_preset) ??
                        (cosmetics.rank_badge_style === "gradient"
                          ? `linear-gradient(90deg, ${cosmetics.profile_color}, #FF9F43)`
                          : undefined),
                      border: buildGradientCSS(cosmetics.gradient_preset) ? "none" : undefined,
                    }}
                  >
                    🌟 R5 All-Star High
                  </span>
                </div>

                {/* Achievement frame preview */}
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-sm"
                      style={{
                        border:
                          cosmetics.achievement_frame === "gold"
                            ? "2px solid #FFD700"
                            : cosmetics.achievement_frame === "diamond"
                            ? "2px solid #00D4FF"
                            : "2px solid #6b7280",
                        boxShadow:
                          cosmetics.achievement_frame === "gold"
                            ? "0 0 6px rgba(255,215,0,0.4)"
                            : cosmetics.achievement_frame === "diamond"
                            ? "0 0 6px rgba(0,212,255,0.4)"
                            : "none",
                      }}
                    >
                      🏅
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-zinc-500">
                <p>Theme: <span className="text-zinc-300 font-bold capitalize">{THEMES.find((t) => t.id === cosmetics.theme)?.icon} {cosmetics.theme}</span></p>
                <p>Badge: <span className="text-zinc-300 font-bold capitalize">{RANK_BADGE_STYLES.find((b) => b.id === cosmetics.rank_badge_style)?.icon} {cosmetics.rank_badge_style}</span></p>
                <p>Frame: <span className="text-zinc-300 font-bold capitalize">{ACHIEVEMENT_FRAMES.find((f) => f.id === cosmetics.achievement_frame)?.icon} {cosmetics.achievement_frame}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}


    </Shell>
  );
}
