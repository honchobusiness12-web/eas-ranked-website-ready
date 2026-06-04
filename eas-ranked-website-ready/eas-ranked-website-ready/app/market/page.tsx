"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Shell from "@/components/Shell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketOverview {
  total_stocks: number;
  active_players: number;
  total_users: number;
  last_updated: string;
  starpoint_value: number;
  starpoint_24h_change: number;
}

interface Stock {
  rank: number;
  player_id: string;
  player_name: string;
  price: number;
  price_change: number;
  price_change_percent: number;
  cr: number;
  status: string;
  wins: number;
  losses: number;
  mvps: number;
}

interface Investor {
  rank: number;
  user_id: string;
  username: string;
  net_worth: number;
  balance: number;
  portfolio_value: number;
  wealth_role: string;
}

interface ShopItem {
  id: string | number;
  name: string;
  price: number;
  category: string;
  stock_remaining: number;
  total_sold: number;
  rarity?: string | null;
  is_sold_out?: boolean;
  is_limited?: boolean;
  resale_supply?: number;
}

interface Transaction {
  id: string | number;
  type: "buy" | "sell" | "daily" | string;
  player_name: string;
  shares: number;
  price: number;
  total: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function stockStatusLabel(remaining: number): { label: string; color: string } {
  if (remaining <= 0) return { label: "Out of Stock", color: "#ef4444" };
  if (remaining <= 5) return { label: "Low Stock", color: "#f59e0b" };
  return { label: "In Stock", color: "#10b981" };
}

function categoryIcon(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("badge")) return "🏅";
  if (c.includes("title")) return "📛";
  if (c.includes("trophy")) return "🏆";
  if (c.includes("cosmetic") || c.includes("skin")) return "🎨";
  if (c.includes("role")) return "👑";
  return "🛍️";
}

function txTypeStyle(type: string): { bg: string; border: string; color: string; label: string } {
  switch (type.toLowerCase()) {
    case "buy":   return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#10b981", label: "BUY" };
    case "sell":  return { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", color: "#f97316", label: "SELL" };
    case "daily": return { bg: "rgba(0,207,255,0.12)",  border: "rgba(0,207,255,0.3)",  color: "#00CFFF", label: "DAILY" };
    default:      return { bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)", color: "#6b7280", label: type.toUpperCase() };
  }
}

function wealthRoleColor(role: string): string {
  if (role === "EAS Tycoon")    return "#f59e0b";
  if (role === "Market Mogul")  return "#a855f7";
  if (role === "Millionaire")   return "#10b981";
  if (role === "Investor")      return "#00CFFF";
  if (role === "Trader")        return "#4DEEEA";
  return "rgba(168,255,246,0.5)";
}

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  subtitle,
  children,
  accentColor = "#00CFFF",
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl backdrop-blur-sm"
      style={{ border: "1px solid rgba(0,207,255,0.18)", background: "rgba(6,43,69,0.75)" }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{
          borderBottom: "1px solid rgba(0,207,255,0.12)",
          background: `linear-gradient(90deg, rgba(0,207,255,0.07), transparent)`,
        }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{
            background: `rgba(0,207,255,0.12)`,
            border: `1px solid rgba(0,207,255,0.25)`,
          }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-black" style={{ color: "#e2f4ff" }}>{title}</h2>
          {subtitle && <p className="text-[11px]" style={{ color: "rgba(168,255,246,0.5)" }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid rgba(0,207,255,0.08)" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg animate-pulse"
          style={{ width: `${60 + (i % 3) * 30}px`, background: "rgba(0,207,255,0.08)" }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
        style={{ background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.15)" }}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold" style={{ color: "rgba(168,255,246,0.6)" }}>{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Overview Stats
// ---------------------------------------------------------------------------

function OverviewStats({ data, loading }: { data: MarketOverview | null; loading: boolean }) {
  const stats = [
    {
      label: "Active Stocks",
      value: data ? fmt(data.total_stocks) : "—",
      icon: "📈",
      color: "#10b981",
    },
    {
      label: "Active Players",
      value: data ? fmt(data.active_players) : "—",
      icon: "🎮",
      color: "#00CFFF",
    },
    {
      label: "Registered Users",
      value: data ? fmt(data.total_users) : "—",
      icon: "👥",
      color: "#4DEEEA",
    },
    {
      label: "SP Value",
      value: data ? `${data.starpoint_value.toFixed(2)} SP` : "—",
      icon: "⭐",
      color: "#f59e0b",
      sub: data
        ? {
            value: `${data.starpoint_24h_change >= 0 ? "+" : ""}${data.starpoint_24h_change.toFixed(2)}`,
            positive: data.starpoint_24h_change >= 0,
          }
        : null,
    },
  ];

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gridAutoRows: "1fr",
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl p-4 backdrop-blur-sm transition-all duration-200 hover:scale-105"
          style={{ border: "1px solid rgba(0,207,255,0.15)", background: "rgba(6,43,69,0.75)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg shrink-0">{s.icon}</span>
            <p
              className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
              style={{ color: "rgba(168,255,246,0.5)" }}
            >
              {s.label}
            </p>
          </div>
          {loading ? (
            <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: "rgba(0,207,255,0.08)" }} />
          ) : (
            <div>
              <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              {s.sub && (
                <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: s.sub.positive ? "#10b981" : "#ef4444" }}>
                  {s.sub.positive ? "▲" : "▼"} {s.sub.value} 24h
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top 10 Stocks Table
// ---------------------------------------------------------------------------

function StocksTable({ stocks, loading }: { stocks: Stock[]; loading: boolean }) {
  return (
    <SectionCard icon="📊" title="Top 10 Stocks" subtitle="Ranked by stock price — main server only">
      {/* Desktop header */}
      <div
        className="hidden md:grid items-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          gridTemplateColumns: "48px 1fr 130px 130px 90px 80px",
          borderBottom: "1px solid rgba(0,207,255,0.10)",
          color: "rgba(168,255,246,0.45)",
        }}
      >
        <span>#</span>
        <span>Player</span>
        <span>Price</span>
        <span>Change</span>
        <span>CR</span>
        <span>Status</span>
      </div>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
      ) : stocks.length === 0 ? (
        <EmptyState icon="📉" message="No stock data available yet" />
      ) : (
        stocks.map((s) => {
          const isPositive = s.price_change >= 0;
          const changeColor = isPositive ? "#10b981" : "#ef4444";
          const changeArrow = isPositive ? "▲" : "▼";
          const statusColor = s.status === "active" ? "#10b981" : "#6b7280";

          return (
            <div
              key={s.player_id}
              className="group transition-all duration-150"
              style={{ borderBottom: "1px solid rgba(0,207,255,0.07)" }}
            >
              {/* Desktop row */}
              <div
                className="hidden md:grid items-center px-5 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors"
                style={{ gridTemplateColumns: "48px 1fr 130px 130px 90px 80px" }}
              >
                <span className="text-sm font-black" style={{ color: "rgba(168,255,246,0.5)" }}>
                  {rankMedal(s.rank)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{s.player_name}</p>
                  <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.4)" }}>
                    {s.wins}W / {s.losses}L · {s.mvps} MVPs
                  </p>
                </div>
                <span className="text-sm font-black tabular-nums" style={{ color: "#00CFFF" }}>
                  {fmt(s.price)} SP
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: changeColor }}>
                  {changeArrow} {fmt(Math.abs(s.price_change))} ({s.price_change_percent >= 0 ? "+" : ""}{s.price_change_percent.toFixed(1)}%)
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: "#A8FFF6" }}>
                  {fmt(s.cr)}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    background: `${statusColor}18`,
                    border: `1px solid ${statusColor}40`,
                    color: statusColor,
                  }}
                >
                  {s.status === "active" ? "Active" : "Delisted"}
                </span>
              </div>

              {/* Mobile card */}
              <div className="md:hidden px-4 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{rankMedal(s.rank)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{s.player_name}</p>
                      <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.4)" }}>
                        CR {fmt(s.cr)} · {s.wins}W/{s.losses}L
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black tabular-nums" style={{ color: "#00CFFF" }}>{fmtCurrency(s.price)} SP</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: changeColor }}>
                      {changeArrow} {s.price_change_percent >= 0 ? "+" : ""}{s.price_change_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Starpoint Exchange
// ---------------------------------------------------------------------------

function StarpointExchange({ data, loading }: { data: MarketOverview | null; loading: boolean }) {
  const isPositive = (data?.starpoint_24h_change ?? 0) >= 0;
  const changeColor = isPositive ? "#10b981" : "#ef4444";
  const changeArrow = isPositive ? "▲" : "▼";

  // Calculate derived values
  const currentValue = data?.starpoint_value ?? 1.0;
  const change24h = data?.starpoint_24h_change ?? 0;
  const high24h = currentValue + Math.abs(change24h);
  const low24h = currentValue - Math.abs(change24h);
  const changePct = currentValue > 0 ? (change24h / currentValue) * 100 : 0;

  // Convert SP to USD (1 SP = $1,000,000)
  const spToUsd = (sp: number) => sp * 1_000_000;

  const stats = [
    {
      label: "Current Value",
      icon: "⭐",
      value: loading ? null : currentValue.toFixed(4),
      usd: loading ? null : spToUsd(currentValue),
      pct: null as string | null,
      color: "#f59e0b",
    },
    {
      label: "24H Change",
      icon: "📊",
      value: loading ? null : `${changeArrow} ${change24h >= 0 ? "+" : ""}${change24h.toFixed(4)}`,
      usd: null as number | null,
      pct: loading ? null : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
      color: changeColor,
    },
    {
      label: "24H High",
      icon: "📈",
      value: loading ? null : high24h.toFixed(4),
      usd: loading ? null : spToUsd(high24h),
      pct: null as string | null,
      color: "#10b981",
    },
    {
      label: "24H Low",
      icon: "📉",
      value: loading ? null : low24h.toFixed(4),
      usd: loading ? null : spToUsd(low24h),
      pct: null as string | null,
      color: "#ef4444",
    },
  ];

  return (
    <SectionCard icon="⭐" title="Starpoint Exchange" subtitle="Current SP market rate">
      {/* Grid container with responsive columns */}
      <div
        className="grid gap-3 p-5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gridAutoRows: "1fr",
        }}
      >
        {stats.map((item) => (
          <div
            key={item.label}
            className="group rounded-xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg flex flex-col justify-between"
            style={{
              background: "rgba(0,207,255,0.06)",
              border: "1px solid rgba(0,207,255,0.12)",
              minHeight: "160px",
            }}
          >
            {/* Label with icon */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg shrink-0">{item.icon}</span>
              <p
                className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ color: "rgba(168,255,246,0.45)" }}
              >
                {item.label}
              </p>
            </div>

            {/* Main value */}
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-24 rounded animate-pulse" style={{ background: "rgba(0,207,255,0.08)" }} />
                <div className="h-4 w-20 rounded animate-pulse" style={{ background: "rgba(0,207,255,0.08)" }} />
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Primary value */}
                <p
                  className="text-lg font-black tabular-nums leading-tight"
                  style={{ color: item.color }}
                >
                  {item.value}
                </p>

                {/* Secondary value (USD or percentage) */}
                {item.usd !== null && (
                  <p className="text-xs font-semibold tabular-nums" style={{ color: "rgba(168,255,246,0.5)" }}>
                    ≈ ${(item.usd as number).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                )}

                {item.pct !== null && (
                  <p className="text-xs font-bold tabular-nums" style={{ color: item.color }}>
                    ({item.pct})
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div
        className="mx-5 mb-5 flex items-center justify-center rounded-xl py-8"
        style={{ background: "rgba(0,207,255,0.04)", border: "1px dashed rgba(0,207,255,0.15)" }}
      >
        <p className="text-xs" style={{ color: "rgba(168,255,246,0.35)" }}>
          📊 Price chart — coming in Phase 3
        </p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Shop Table
// ---------------------------------------------------------------------------

const RARITY_COLORS_MARKET: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
  mythic: "#ef4444",
};

function ShopTable({ items, loading }: { items: ShopItem[]; loading: boolean }) {
  return (
    <SectionCard icon="🛍️" title="Market Shop" subtitle="Available items and remaining inventory">
      {/* Desktop header */}
      <div
        className="hidden md:grid items-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          gridTemplateColumns: "1fr 90px 120px 110px 80px 120px",
          borderBottom: "1px solid rgba(0,207,255,0.10)",
          color: "rgba(168,255,246,0.45)",
        }}
      >
        <span>Item</span>
        <span>Rarity</span>
        <span>Value</span>
        <span>Stock</span>
        <span>Sold</span>
        <span>Status</span>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
      ) : items.length === 0 ? (
        <EmptyState icon="🏪" message="No shop items configured yet" />
      ) : (
        items.map((item) => {
          const soldOut = item.is_sold_out ?? item.stock_remaining <= 0;
          const { label, color } = soldOut
            ? { label: "Out of Stock", color: "#ef4444" }
            : stockStatusLabel(item.stock_remaining);
          const rarityColor = item.rarity ? (RARITY_COLORS_MARKET[item.rarity] ?? "#6b7280") : null;

          return (
            <div
              key={item.id}
              className="group transition-all duration-150"
              style={{ borderBottom: "1px solid rgba(0,207,255,0.07)" }}
            >
              {/* Desktop */}
              <div
                className="hidden md:grid items-center px-5 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors"
                style={{ gridTemplateColumns: "1fr 90px 120px 110px 80px 120px" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{categoryIcon(item.category)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize"
                        style={{ background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.18)", color: "#4DEEEA" }}
                      >
                        {item.category}
                      </span>
                      {item.is_limited && (
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}
                        >
                          Limited
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Rarity */}
                <div>
                  {rarityColor ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                      style={{ background: `${rarityColor}22`, border: `1px solid ${rarityColor}60`, color: rarityColor }}
                    >
                      {item.rarity}
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-xs">—</span>
                  )}
                </div>
                {/* Value */}
                <span className="text-sm font-black tabular-nums" style={{ color: "#f59e0b" }}>
                  {fmt(item.price)} SP
                </span>
                {/* Stock */}
                <div>
                  <span className="text-sm font-bold tabular-nums" style={{ color }}>
                    {item.stock_remaining}
                  </span>
                  {(item.resale_supply ?? 0) > 0 && (
                    <p className="text-[10px] text-zinc-500">+{item.resale_supply} resale</p>
                  )}
                </div>
                {/* Sold */}
                <span className="text-sm tabular-nums" style={{ color: "rgba(168,255,246,0.5)" }}>
                  {item.total_sold}
                </span>
                {/* Status */}
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
                >
                  {label}
                </span>
              </div>

              {/* Mobile */}
              <div className="md:hidden px-4 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{categoryIcon(item.category)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-[10px] capitalize" style={{ color: "rgba(168,255,246,0.4)" }}>{item.category}</p>
                        {rarityColor && (
                          <span
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize"
                            style={{ background: `${rarityColor}22`, border: `1px solid ${rarityColor}60`, color: rarityColor }}
                          >
                            {item.rarity}
                          </span>
                        )}
                        {item.is_limited && (
                          <span className="text-[9px] font-bold" style={{ color: "#f59e0b" }}>Limited</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black tabular-nums" style={{ color: "#f59e0b" }}>{fmtCurrency(item.price)} SP</p>
                    <p className="text-xs font-bold" style={{ color }}>{label}</p>
                    {(item.resale_supply ?? 0) > 0 && (
                      <p className="text-[10px] text-zinc-500">+{item.resale_supply} resale</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Richest Investors Leaderboard
// ---------------------------------------------------------------------------

function InvestorLeaderboard({ users, loading }: { users: Investor[]; loading: boolean }) {
  return (
    <SectionCard icon="💰" title="Richest Investors" subtitle="Top 10 by net worth (balance + portfolio)">
      {/* Desktop header */}
      <div
        className="hidden md:grid items-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          gridTemplateColumns: "56px 1fr 140px 130px 120px",
          borderBottom: "1px solid rgba(0,207,255,0.10)",
          color: "rgba(168,255,246,0.45)",
        }}
      >
        <span>#</span>
        <span>User</span>
        <span>Net Worth</span>
        <span>Portfolio</span>
        <span>Role</span>
      </div>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
      ) : users.length === 0 ? (
        <EmptyState icon="💸" message="No investor data available yet" />
      ) : (
        users.map((u) => {
          const roleColor = wealthRoleColor(u.wealth_role);
          return (
            <div
              key={u.user_id}
              className="group transition-all duration-150"
              style={{ borderBottom: "1px solid rgba(0,207,255,0.07)" }}
            >
              {/* Desktop */}
              <div
                className="hidden md:grid items-center px-5 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors"
                style={{ gridTemplateColumns: "56px 1fr 140px 130px 120px" }}
              >
                <span className="text-sm font-black" style={{ color: "rgba(168,255,246,0.5)" }}>
                  {rankMedal(u.rank)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{u.username}</p>
                  <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.4)" }}>
                    Balance: {fmtCurrency(u.balance)} SP
                  </p>
                </div>
                <span className="text-sm font-black tabular-nums" style={{ color: "#10b981" }}>
                  {fmtCurrency(u.net_worth)} SP
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: "#00CFFF" }}>
                  {fmtCurrency(u.portfolio_value)} SP
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{ background: `${roleColor}18`, border: `1px solid ${roleColor}40`, color: roleColor }}
                >
                  {u.wealth_role}
                </span>
              </div>

              {/* Mobile */}
              <div className="md:hidden px-4 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{rankMedal(u.rank)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{u.username}</p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: `${roleColor}18`, border: `1px solid ${roleColor}40`, color: roleColor }}
                      >
                        {u.wealth_role}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black tabular-nums" style={{ color: "#10b981" }}>{fmtCurrency(u.net_worth)} SP</p>
                    <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.4)" }}>Portfolio: {fmtCurrency(u.portfolio_value)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Recent Transactions
// ---------------------------------------------------------------------------

function RecentTransactions({ transactions, loading }: { transactions: Transaction[]; loading: boolean }) {
  return (
    <SectionCard icon="🔄" title="Recent Transactions" subtitle="Last 20 market transactions — main server only">
      {/* Desktop header */}
      <div
        className="hidden md:grid items-center px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          gridTemplateColumns: "80px 1fr 80px 120px 130px 100px",
          borderBottom: "1px solid rgba(0,207,255,0.10)",
          color: "rgba(168,255,246,0.45)",
        }}
      >
        <span>Type</span>
        <span>Player</span>
        <span>Shares</span>
        <span>Price</span>
        <span>Total</span>
        <span>Time</span>
      </div>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
      ) : transactions.length === 0 ? (
        <EmptyState icon="📋" message="No recent transactions" />
      ) : (
        transactions.map((tx) => {
          const style = txTypeStyle(tx.type);
          return (
            <div
              key={tx.id}
              className="group transition-all duration-150"
              style={{ borderBottom: "1px solid rgba(0,207,255,0.07)" }}
            >
              {/* Desktop */}
              <div
                className="hidden md:grid items-center px-5 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors"
                style={{ gridTemplateColumns: "80px 1fr 80px 120px 130px 100px" }}
              >
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
                >
                  {style.label}
                </span>
                <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{tx.player_name}</p>
                <span className="text-sm tabular-nums" style={{ color: "rgba(168,255,246,0.6)" }}>
                  {tx.shares > 0 ? tx.shares : "—"}
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: "#00CFFF" }}>
                  {fmt(tx.price)} SP
                </span>
                <span className="text-sm font-black tabular-nums" style={{ color: "#A8FFF6" }}>
                  {fmt(tx.total)} SP
                </span>
                <span className="text-xs" style={{ color: "rgba(168,255,246,0.4)" }}>
                  {timeAgo(tx.timestamp)}
                </span>
              </div>

              {/* Mobile */}
              <div className="md:hidden px-4 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
                    >
                      {style.label}
                    </span>
                    <p className="text-sm font-bold truncate" style={{ color: "#e2f4ff" }}>{tx.player_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black tabular-nums" style={{ color: "#A8FFF6" }}>{fmtCurrency(tx.total)} SP</p>
                    <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.4)" }}>{timeAgo(tx.timestamp)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const [ovRes, stRes, lbRes, shRes, txRes] = await Promise.allSettled([
        fetch("/api/market/overview").then((r) => r.json()),
        fetch("/api/market/stocks").then((r) => r.json()),
        fetch("/api/market/leaderboard").then((r) => r.json()),
        fetch("/api/market/shop").then((r) => r.json()),
        fetch("/api/market/transactions").then((r) => r.json()),
      ]);

      if (ovRes.status === "fulfilled" && !ovRes.value.error) {
        setOverview(ovRes.value);
      }
      if (stRes.status === "fulfilled" && stRes.value.stocks) {
        setStocks(stRes.value.stocks);
      }
      if (lbRes.status === "fulfilled" && lbRes.value.users) {
        setInvestors(lbRes.value.users);
      }
      if (shRes.status === "fulfilled" && shRes.value.items) {
        setShopItems(shRes.value.items);
      }
      if (txRes.status === "fulfilled" && txRes.value.transactions) {
        setTransactions(txRes.value.transactions);
      }

      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch {
      setError("Failed to load market data. Please try again.");
    } finally {
      setLoadingOverview(false);
      setLoadingStocks(false);
      setLoadingInvestors(false);
      setLoadingShop(false);
      setLoadingTx(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchAll(), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  // "X seconds ago" ticker
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const lastUpdatedLabel = lastUpdated
    ? secondsAgo < 5
      ? "Just now"
      : secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ago`
    : "Loading…";

  return (
    <Shell>
      {/* ── Page header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.28)" }}
          >
            📈
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "#e2f4ff" }}>
              Live Market
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(168,255,246,0.5)" }}>
              EAS Arena stock market — main server only · view-only dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Last updated */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ border: "1px solid rgba(0,207,255,0.18)", background: "rgba(0,207,255,0.06)", color: "rgba(168,255,246,0.6)" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            <span>Updated: {lastUpdatedLabel}</span>
          </div>

          {/* Manual refresh */}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 disabled:opacity-50"
            style={{ border: "1px solid rgba(0,207,255,0.25)", background: "rgba(0,207,255,0.08)", color: "#00CFFF" }}
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          className="mb-5 flex items-center justify-between gap-4 rounded-xl px-4 py-3"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)", color: "#fca5a5" }}
        >
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <p className="text-sm font-semibold">{error}</p>
          </div>
          <button
            onClick={() => fetchAll(true)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Auto-refresh notice ── */}
      <div
        className="mb-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs"
        style={{ background: "rgba(0,207,255,0.05)", border: "1px solid rgba(0,207,255,0.12)", color: "rgba(168,255,246,0.5)" }}
      >
        <span>ℹ️</span>
        <span>
          This dashboard auto-refreshes every 60 seconds. All data is from the main EAS Arena server only.
          Trading is done exclusively via Discord commands.
        </span>
      </div>

      {/* ── Section 1: Market Overview ── */}
      <section className="mb-5">
        <OverviewStats data={overview} loading={loadingOverview} />
      </section>

      {/* ── Section 2: Top 10 Stocks + Starpoint Exchange ── */}
      <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <StocksTable stocks={stocks} loading={loadingStocks} />
        <StarpointExchange data={overview} loading={loadingOverview} />
      </section>

      {/* ── Section 3: Shop + Leaderboard ── */}
      <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ShopTable items={shopItems} loading={loadingShop} />
        <InvestorLeaderboard users={investors} loading={loadingInvestors} />
      </section>

      {/* ── Section 4: Recent Transactions ── */}
      <section className="mb-5">
        <RecentTransactions transactions={transactions} loading={loadingTx} />
      </section>

      {/* ── Footer note ── */}
      <div className="mt-2 mb-6 text-center">
        <p className="text-[11px]" style={{ color: "rgba(168,255,246,0.3)" }}>
          EAS Arena Live Market · Main Server (Guild ID: 1467697766837915804) · View-only · All trading via Discord
        </p>
      </div>
    </Shell>
  );
}
