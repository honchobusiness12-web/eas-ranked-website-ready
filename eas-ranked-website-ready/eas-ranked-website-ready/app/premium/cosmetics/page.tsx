"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import {
  THEMES,
  RANK_BADGE_STYLES,
  PLAYER_TITLES,
  PROFILE_COLORS,
  ACHIEVEMENT_FRAMES,
} from "@/lib/premium-constants";

interface CosmeticsState {
  theme: string;
  rank_badge_style: string;
  player_title: string;
  profile_color: string;
  achievement_frame: string;
}

const DEFAULT_COSMETICS: CosmeticsState = {
  theme: "dark",
  rank_badge_style: "default",
  player_title: "",
  profile_color: "#FF6B6B",
  achievement_frame: "default",
};

export default function CosmeticsPage() {
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cosmetics, setCosmetics] = useState<CosmeticsState>(DEFAULT_COSMETICS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"themes" | "badges" | "titles" | "colors" | "frames">("themes");

  async function checkPremium(uid: string) {
    setChecking(true);
    try {
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
        });
      }
    } catch {
      setIsPremium(false);
    } finally {
      setChecking(false);
    }
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    setUserId(inputId.trim());
    checkPremium(inputId.trim());
  }

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
      setSaveMsg(data.success ? "✅ Cosmetics saved successfully!" : data.error || "Failed to save.");
    } catch {
      setSaveMsg("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: "themes" as const, label: "🎨 Themes" },
    { id: "badges" as const, label: "🏅 Rank Badges" },
    { id: "titles" as const, label: "📛 Titles" },
    { id: "colors" as const, label: "🎨 Colors" },
    { id: "frames" as const, label: "🖼️ Frames" },
  ];

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🎨 Cosmetics Selector</h1>
          <p className="mt-2 text-zinc-400">Personalise your EAS Arena profile. Premium members only.</p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* User ID lookup */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
        <h2 className="mb-3 text-lg font-black">🔍 Enter Your Discord User ID</h2>
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
            {checking ? "Checking…" : "Load"}
          </button>
        </form>
      </div>

      {userId && !checking && !isPremium && (
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

      {userId && !checking && isPremium && (
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
                  background: `linear-gradient(135deg, #0d0d14, ${cosmetics.profile_color}10)`,
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
                      color: cosmetics.profile_color,
                      boxShadow:
                        cosmetics.rank_badge_style === "glowing"
                          ? `0 0 10px ${cosmetics.profile_color}50`
                          : "none",
                      background:
                        cosmetics.rank_badge_style === "gradient"
                          ? `linear-gradient(90deg, ${cosmetics.profile_color}, #FF9F43)`
                          : undefined,
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

      {!userId && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-5xl mb-4">🎨</p>
          <h2 className="text-xl font-black text-zinc-300">Enter your Discord User ID above to get started</h2>
          <p className="mt-2 text-sm text-zinc-500">Premium members can customise their profile appearance.</p>
        </div>
      )}
    </Shell>
  );
}
