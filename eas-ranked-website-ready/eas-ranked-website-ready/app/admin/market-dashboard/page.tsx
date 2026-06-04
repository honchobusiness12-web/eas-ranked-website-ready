'use client';

import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import SoundLink from '@/components/SoundLink';

// ---------------------------------------------------------------------------
// Access control — only Discord user 733871667788644445
// ---------------------------------------------------------------------------

const MARKET_ADMIN_ID = '733871667788644445';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  rarity: string;
  active: boolean;
  limited: boolean;
  max_stock: number | null;
  current_stock: number | null;
  min_value: number | null;
  max_value: number | null;
  resale_percent: number;
  badge_id: string | null;
  role_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalItems: number;
  activeItems: number;
  disabledItems: number;
  limitedItems: number;
  totalStock: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPrice(n: number): string {
  return n.toLocaleString() + ' SP';
}

const RARITY_COLORS: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#10b981',
  rare: '#00d4ff',
  epic: '#a855f7',
  legendary: '#ff6b6b',
  mythic: '#ffd700',
};

const CATEGORY_ICONS: Record<string, string> = {
  item: '📦',
  badge: '🏅',
  role: '👑',
  cosmetic: '✨',
  boost: '⚡',
  other: '🔮',
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{
        background: `${color}0d`,
        border: `1.5px solid ${color}30`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}40` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="text-2xl font-black text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-zinc-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MarketDashboardPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Auth check — only allow Discord user 733871667788644445
  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((data) => {
        setIsAuthorized(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shop/items?limit=500');
      if (res.ok) {
        const data = await res.json();
        const allItems: ShopItem[] = data.items ?? [];
        setItems(allItems);

        // Compute stats
        const activeItems = allItems.filter((i) => i.active);
        const disabledItems = allItems.filter((i) => !i.active);
        const limitedItems = allItems.filter((i) => i.limited);
        const totalStock = allItems.reduce((sum, i) => sum + (i.current_stock ?? 0), 0);
        const prices = allItems.map((i) => i.price);
        const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;

        const byCategory: Record<string, number> = {};
        const byRarity: Record<string, number> = {};
        for (const item of allItems) {
          byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
          byRarity[item.rarity] = (byRarity[item.rarity] ?? 0) + 1;
        }

        setStats({
          totalItems: allItems.length,
          activeItems: activeItems.length,
          disabledItems: disabledItems.length,
          limitedItems: limitedItems.length,
          totalStock,
          avgPrice,
          minPrice,
          maxPrice,
          byCategory,
          byRarity,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) loadData();
  }, [isAuthorized, loadData]);

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse font-bold">Checking access…</p>
        </div>
      </Shell>
    );
  }

  if (!isAuthorized) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🚫</p>
            <h1 className="text-2xl font-black text-red-400">Access Denied</h1>
            <p className="mt-2 text-zinc-400">This page is restricted to Discord user {MARKET_ADMIN_ID}.</p>
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
      {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative mb-8 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a14 0%, #0d0d1a 40%, #0a0a14 100%)',
          border: '2px solid rgba(0,212,255,0.30)',
          boxShadow: '0 0 80px rgba(0,212,255,0.08), 0 0 40px rgba(16,185,129,0.06)',
        }}
      >
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)', transform: 'translate(-30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10b981, transparent)', transform: 'translate(30%, 30%)' }}
        />

        <div className="relative px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.80))' }}>
              📊
            </span>
            <div>
              <h1
                className="text-4xl font-black tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(90deg, #00d4ff, #10b981, #ffd700)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(0,212,255,0.40))',
                }}
              >
                MARKET DASHBOARD
              </h1>
              <p className="text-sm font-bold text-zinc-400 mt-1">
                🔐 Restricted Access — Market Shop Statistics &amp; Overview
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <SoundLink
              href="/admin/market-shop"
              soundType="click"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition hover:opacity-80"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.40)', color: '#10b981' }}
            >
              🛍️ Manage Items
            </SoundLink>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition hover:opacity-80"
              style={{ background: 'rgba(0,212,255,0.12)', border: '1.5px solid rgba(0,212,255,0.40)', color: '#00d4ff' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse font-bold">Loading market data…</p>
        </div>
      )}

      {!loading && stats && (
        <div className="space-y-6">
          {/* ─── Overview Stats ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Overview</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon="🛍️" label="Total Items" value={stats.totalItems} color="#00d4ff" />
              <StatCard icon="✅" label="Active Items" value={stats.activeItems} sub={`${stats.totalItems ? Math.round((stats.activeItems / stats.totalItems) * 100) : 0}% of total`} color="#10b981" />
              <StatCard icon="⏸️" label="Disabled" value={stats.disabledItems} color="#f59e0b" />
              <StatCard icon="⭐" label="Limited Edition" value={stats.limitedItems} color="#a855f7" />
            </div>
          </section>

          {/* ─── Price Stats ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Pricing</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon="📦" label="Total Stock" value={stats.totalStock.toLocaleString()} sub="tracked units" color="#ffd700" />
              <StatCard icon="💰" label="Avg Price" value={fmtPrice(stats.avgPrice)} color="#10b981" />
              <StatCard icon="📉" label="Min Price" value={fmtPrice(stats.minPrice)} color="#6b7280" />
              <StatCard icon="📈" label="Max Price" value={fmtPrice(stats.maxPrice)} color="#ff6b6b" />
            </div>
          </section>

          {/* ─── By Category & Rarity ────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* By Category */}
            <section
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Items by Category</h2>
              <div className="space-y-2.5">
                {Object.entries(stats.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => {
                    const pct = stats.totalItems ? Math.round((count / stats.totalItems) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-zinc-300 flex items-center gap-1.5">
                            <span>{CATEGORY_ICONS[cat] ?? '🔮'}</span>
                            <span className="capitalize">{cat}</span>
                          </span>
                          <span className="text-xs font-black text-zinc-400">{count} <span className="text-zinc-600">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00d4ff, #10b981)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* By Rarity */}
            <section
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Items by Rarity</h2>
              <div className="space-y-2.5">
                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map((rarity) => {
                  const count = stats.byRarity[rarity] ?? 0;
                  const pct = stats.totalItems ? Math.round((count / stats.totalItems) * 100) : 0;
                  const color = RARITY_COLORS[rarity] ?? '#6b7280';
                  return (
                    <div key={rarity}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-black capitalize"
                          style={{ color }}
                        >
                          {rarity}
                        </span>
                        <span className="text-xs font-black text-zinc-400">{count} <span className="text-zinc-600">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ─── Recent Items ─────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Recent Items</h2>
              <SoundLink
                href="/admin/market-shop"
                soundType="click"
                className="text-xs font-black text-cyan-400 hover:text-cyan-300 transition"
              >
                View All →
              </SoundLink>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}
            >
              {items.slice(0, 10).map((item, idx) => {
                const rarityColor = RARITY_COLORS[item.rarity] ?? '#6b7280';
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: `${rarityColor}18`, border: `1px solid ${rarityColor}40` }}
                    >
                      {CATEGORY_ICONS[item.category] ?? '🔮'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] font-black uppercase"
                          style={{ color: rarityColor }}
                        >
                          {item.rarity}
                        </span>
                        {item.limited && (
                          <span className="text-[10px] font-black text-amber-400 border border-amber-400/30 rounded-full px-1.5">LIMITED</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-yellow-400">{fmtPrice(item.price)}</p>
                      <span
                        className={`text-[10px] font-black ${item.active ? 'text-green-400' : 'text-zinc-500'}`}
                      >
                        {item.active ? '● Active' : '○ Off'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-zinc-600 flex-shrink-0 hidden sm:block">#{idx + 1}</span>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-3">🛍️</p>
                  <p className="text-zinc-500 font-bold">No items in the shop yet</p>
                  <SoundLink
                    href="/admin/market-shop"
                    soundType="click"
                    className="mt-3 inline-block text-xs font-black text-green-400 hover:text-green-300 transition"
                  >
                    Create your first item →
                  </SoundLink>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}
