'use client';

import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import ShopItemCard, { type ShopItem } from '@/components/ShopItemCard';
import PurchaseModal from '@/components/PurchaseModal';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';
import type { DiscordUser } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RARITIES = ['', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const CATEGORIES = ['', 'badge', 'role', 'cosmetic', 'boost', 'item', 'other'];
const PAGE_SIZE = 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function BalanceBadge({ balance, loading }: { balance: number; loading: boolean }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-4 py-2.5"
      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
    >
      <span className="text-lg">⭐</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(168,255,246,0.5)' }}>
          Your Balance
        </p>
        {loading ? (
          <div className="h-4 w-20 animate-pulse rounded" style={{ background: 'rgba(245,158,11,0.2)' }} />
        ) : (
          <p className="text-sm font-black tabular-nums" style={{ color: '#f59e0b' }}>
            {balance.toLocaleString()} SP
          </p>
        )}
      </div>
    </div>
  );
}

function FilterBar({
  search, setSearch,
  category, setCategory,
  rarity, setRarity,
  limited, setLimited,
  onReset,
}: {
  search: string; setSearch: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  rarity: string; setRarity: (v: string) => void;
  limited: string; setLimited: (v: string) => void;
  onReset: () => void;
}) {
  const hasFilters = search || category || rarity || limited;

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl p-4"
      style={{ background: 'rgba(6,43,69,0.75)', border: '1px solid rgba(0,207,255,0.15)' }}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(168,255,246,0.4)' }}>
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="w-full rounded-xl py-2 pl-9 pr-3 text-sm font-medium transition-all focus:outline-none"
          style={{
            background: 'rgba(0,207,255,0.06)',
            border: '1px solid rgba(0,207,255,0.18)',
            color: '#e2f4ff',
          }}
        />
      </div>

      {/* Category */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-xl px-3 py-2 text-sm font-bold transition-all focus:outline-none"
        style={{
          background: 'rgba(0,207,255,0.06)',
          border: '1px solid rgba(0,207,255,0.18)',
          color: category ? '#e2f4ff' : 'rgba(168,255,246,0.5)',
        }}
      >
        <option value="">All Categories</option>
        {CATEGORIES.filter(Boolean).map((c) => (
          <option key={c} value={c} style={{ background: '#062B45' }}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </option>
        ))}
      </select>

      {/* Rarity */}
      <select
        value={rarity}
        onChange={(e) => setRarity(e.target.value)}
        className="rounded-xl px-3 py-2 text-sm font-bold transition-all focus:outline-none"
        style={{
          background: 'rgba(0,207,255,0.06)',
          border: '1px solid rgba(0,207,255,0.18)',
          color: rarity ? '#e2f4ff' : 'rgba(168,255,246,0.5)',
        }}
      >
        <option value="">All Rarities</option>
        {RARITIES.filter(Boolean).map((r) => (
          <option key={r} value={r} style={{ background: '#062B45' }}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>

      {/* Limited toggle */}
      <select
        value={limited}
        onChange={(e) => setLimited(e.target.value)}
        className="rounded-xl px-3 py-2 text-sm font-bold transition-all focus:outline-none"
        style={{
          background: 'rgba(0,207,255,0.06)',
          border: '1px solid rgba(0,207,255,0.18)',
          color: limited ? '#e2f4ff' : 'rgba(168,255,246,0.5)',
        }}
      >
        <option value="">All Items</option>
        <option value="true" style={{ background: '#062B45' }}>Limited Only</option>
        <option value="false" style={{ background: '#062B45' }}>Unlimited Only</option>
      </select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={onReset}
          className="rounded-xl px-3 py-2 text-xs font-black transition-all hover:opacity-80"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
        >
          ✕ Reset
        </button>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: 'rgba(6,43,69,0.6)', border: '1px solid rgba(0,207,255,0.1)', height: 280 }}
    >
      <div className="h-1 w-full" style={{ background: 'rgba(0,207,255,0.1)' }} />
      <div className="flex flex-col items-center pt-6 gap-3 px-4">
        <div className="h-16 w-16 rounded-2xl" style={{ background: 'rgba(0,207,255,0.08)' }} />
        <div className="h-4 w-3/4 rounded-lg" style={{ background: 'rgba(0,207,255,0.08)' }} />
        <div className="h-3 w-1/2 rounded-lg" style={{ background: 'rgba(0,207,255,0.06)' }} />
        <div className="h-3 w-2/3 rounded-lg" style={{ background: 'rgba(0,207,255,0.06)' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ShopPage() {
  const { addToast } = useToast();

  // Auth state
  const [user, setUser] = useState<DiscordUser | null | undefined>(undefined);
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Shop state
  const [items, setItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ownedItemIds, setOwnedItemIds] = useState<Set<number>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [rarity, setRarity] = useState('');
  const [limited, setLimited] = useState('');
  const [page, setPage] = useState(0);

  // Purchase modal
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch user session
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch user balance
  // ---------------------------------------------------------------------------

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    setBalanceLoading(true);
    try {
      const res = await fetch('/api/shop/balance');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setBalanceLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // ---------------------------------------------------------------------------
  // Fetch owned items
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    fetch('/api/shop/inventory')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.items) {
          setOwnedItemIds(new Set(data.items.map((i: { item_id: number }) => i.item_id)));
        }
      })
      .catch(() => {});
  }, [user]);

  // ---------------------------------------------------------------------------
  // Fetch shop items
  // ---------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (rarity)   params.set('rarity', rarity);
      if (search)   params.set('search', search);
      if (limited)  params.set('limited', limited);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));

      const res = await fetch(`/api/shop/items?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      addToast('Failed to load shop items.', 'error');
    } finally {
      setLoading(false);
    }
  }, [category, rarity, search, limited, page, addToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [category, rarity, search, limited]);

  // ---------------------------------------------------------------------------
  // Purchase handler
  // ---------------------------------------------------------------------------

  async function handlePurchase() {
    if (!selectedItem) return;
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: selectedItem.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error ?? 'Purchase failed.', 'error');
        return;
      }

      addToast(`✅ Purchased "${selectedItem.name}" successfully!`, 'success');
      setBalance(data.newBalance ?? 0);
      setOwnedItemIds((prev) => new Set([...prev, selectedItem.id]));
      setSelectedItem(null);
    } catch {
      addToast('Purchase failed. Please try again.', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isLoggedIn = !!user;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Shell user={user ?? null}>
      <div className="space-y-6 p-4 md:p-6">

        {/* ── Page Header ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: 'rgba(6,43,69,0.85)', border: '1px solid rgba(0,207,255,0.18)' }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-10 blur-3xl"
            style={{ background: '#00CFFF' }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                  style={{ background: 'rgba(0,207,255,0.12)', border: '1px solid rgba(0,207,255,0.25)' }}
                >
                  🛍️
                </div>
                <h1 className="text-2xl font-black" style={{ color: '#e2f4ff' }}>
                  EAS Arena Shop
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'rgba(168,255,246,0.6)' }}>
                Spend your StarPoints on exclusive badges, roles, and cosmetics.
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(168,255,246,0.4)' }}>
                {total > 0 ? `${total} item${total !== 1 ? 's' : ''} available` : 'Loading…'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isLoggedIn ? (
                <>
                  <BalanceBadge balance={balance} loading={balanceLoading} />
                  <Link
                    href="/inventory"
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all hover:opacity-90"
                    style={{ background: 'rgba(0,207,255,0.12)', border: '1px solid rgba(0,207,255,0.25)', color: '#00CFFF' }}
                  >
                    🎒 My Inventory
                  </Link>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all hover:opacity-90"
                  style={{ background: 'rgba(88,101,242,0.2)', border: '1px solid rgba(88,101,242,0.4)', color: '#7289da' }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Login with Discord
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <FilterBar
          search={search} setSearch={setSearch}
          category={category} setCategory={setCategory}
          rarity={rarity} setRarity={setRarity}
          limited={limited} setLimited={setLimited}
          onReset={() => { setSearch(''); setCategory(''); setRarity(''); setLimited(''); }}
        />

        {/* ── Not logged in banner ── */}
        {!isLoggedIn && user !== undefined && (
          <div
            className="flex items-center gap-3 rounded-2xl px-5 py-4"
            style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.25)' }}
          >
            <span className="text-xl">🔒</span>
            <div className="flex-1">
              <p className="text-sm font-black" style={{ color: '#7289da' }}>
                Login required to purchase items
              </p>
              <p className="text-xs" style={{ color: 'rgba(168,255,246,0.5)' }}>
                Connect your Discord account to buy items with your StarPoints.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="shrink-0 rounded-xl px-4 py-2 text-xs font-black transition-all hover:opacity-90"
              style={{ background: 'rgba(88,101,242,0.25)', border: '1px solid rgba(88,101,242,0.4)', color: '#7289da' }}
            >
              Login
            </Link>
          </div>
        )}

        {/* ── Items Grid ── */}
        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
            style={{ background: 'rgba(6,43,69,0.6)', border: '1px solid rgba(0,207,255,0.12)' }}
          >
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.15)' }}
            >
              🛍️
            </div>
            <p className="text-lg font-black" style={{ color: 'rgba(168,255,246,0.7)' }}>
              No items found
            </p>
            <p className="mt-1 text-sm" style={{ color: 'rgba(168,255,246,0.4)' }}>
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {items.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                onBuy={setSelectedItem}
                isOwned={ownedItemIds.has(item.id)}
                userBalance={balance}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-xl px-4 py-2 text-sm font-black transition-all disabled:opacity-30"
              style={{ background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.2)', color: '#00CFFF' }}
            >
              ← Prev
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const pageNum = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className="h-8 w-8 rounded-lg text-xs font-black transition-all"
                    style={
                      pageNum === page
                        ? { background: 'rgba(0,207,255,0.25)', border: '1px solid rgba(0,207,255,0.5)', color: '#00CFFF' }
                        : { background: 'rgba(0,207,255,0.06)', border: '1px solid rgba(0,207,255,0.12)', color: 'rgba(168,255,246,0.6)' }
                    }
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-xl px-4 py-2 text-sm font-black transition-all disabled:opacity-30"
              style={{ background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.2)', color: '#00CFFF' }}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Results count ── */}
        {!loading && items.length > 0 && (
          <p className="text-center text-xs" style={{ color: 'rgba(168,255,246,0.4)' }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} items
          </p>
        )}
      </div>

      {/* ── Purchase Modal ── */}
      {selectedItem && (
        <PurchaseModal
          item={selectedItem}
          userBalance={balance}
          onConfirm={handlePurchase}
          onCancel={() => setSelectedItem(null)}
        />
      )}
    </Shell>
  );
}
