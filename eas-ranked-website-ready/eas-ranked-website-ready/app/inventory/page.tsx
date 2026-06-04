'use client';

import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import InventoryItem, {
  type InventoryBadge,
  type InventoryRole,
  type InventoryShopItem,
} from '@/components/InventoryItem';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';
import type { DiscordUser } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveTab = 'badges' | 'roles' | 'items';

// ---------------------------------------------------------------------------
// Sell Confirm Modal
// ---------------------------------------------------------------------------

function SellConfirmModal({
  item,
  onConfirm,
  onCancel,
  loading,
}: {
  item: InventoryShopItem;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const resaleValue = Math.floor(item.price * (item.resale_percent / 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: 'rgba(6,43,69,0.97)', border: '2px solid rgba(245,158,11,0.3)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5"
          style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}
        >
          <h2 className="text-lg font-black" style={{ color: '#e2f4ff' }}>Sell Item</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(168,255,246,0.55)' }}>
            This action cannot be undone
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Item info */}
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <p className="font-black text-sm" style={{ color: '#e2f4ff' }}>{item.name}</p>
            {item.description && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(168,255,246,0.5)' }}>{item.description}</p>
            )}
          </div>

          {/* Refund breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(168,255,246,0.6)' }}>Original Price</span>
              <span className="font-black" style={{ color: '#e2f4ff' }}>{item.price.toLocaleString()} SP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(168,255,246,0.6)' }}>Resale Rate</span>
              <span className="font-black" style={{ color: '#f59e0b' }}>{item.resale_percent}%</span>
            </div>
            <div className="h-px" style={{ background: 'rgba(245,158,11,0.2)' }} />
            <div className="flex justify-between text-sm">
              <span className="font-bold" style={{ color: 'rgba(168,255,246,0.8)' }}>You Receive</span>
              <span className="font-black" style={{ color: '#10b981' }}>+{resaleValue.toLocaleString()} SP</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border py-3 text-sm font-black transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(168,255,246,0.7)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-3 text-sm font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Selling…
              </span>
            ) : (
              `Sell for ${resaleValue.toLocaleString()} SP`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Button
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-200"
      style={
        active
          ? { background: 'rgba(0,207,255,0.18)', border: '1px solid rgba(0,207,255,0.4)', color: '#00CFFF' }
          : { background: 'rgba(0,207,255,0.05)', border: '1px solid rgba(0,207,255,0.12)', color: 'rgba(168,255,246,0.55)' }
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count > 0 && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
          style={
            active
              ? { background: 'rgba(0,207,255,0.25)', color: '#00CFFF' }
              : { background: 'rgba(0,207,255,0.1)', color: 'rgba(168,255,246,0.5)' }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InventoryPage() {
  const { addToast } = useToast();

  // Auth state
  const [user, setUser] = useState<DiscordUser | null | undefined>(undefined);
  const [balance, setBalance] = useState(0);

  // Inventory state
  const [badges, setBadges] = useState<InventoryBadge[]>([]);
  const [roles, setRoles] = useState<InventoryRole[]>([]);
  const [items, setItems] = useState<InventoryShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('badges');
  const [sellItem, setSellItem] = useState<InventoryShopItem | null>(null);
  const [selling, setSelling] = useState(false);

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
  // Fetch balance
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    fetch('/api/shop/balance')
      .then((r) => r.ok ? r.json() : { balance: 0 })
      .then((data) => setBalance(data.balance ?? 0))
      .catch(() => {});
  }, [user]);

  // ---------------------------------------------------------------------------
  // Fetch inventory
  // ---------------------------------------------------------------------------

  const fetchInventory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/shop/inventory');
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      setBadges(data.badges ?? []);
      setRoles(data.roles ?? []);
      setItems(data.items ?? []);
    } catch {
      addToast('Failed to load inventory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    if (user) fetchInventory();
    else if (user === null) setLoading(false);
  }, [user, fetchInventory]);

  // ---------------------------------------------------------------------------
  // Sell handler
  // ---------------------------------------------------------------------------

  async function handleSell() {
    if (!sellItem || selling) return;
    setSelling(true);
    try {
      const res = await fetch('/api/shop/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: sellItem.item_id }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error ?? 'Sale failed.', 'error');
        return;
      }

      addToast(`💰 Sold "${sellItem.name}" for ${data.refund?.toLocaleString()} SP!`, 'success');
      setBalance(data.newBalance ?? 0);
      setItems((prev) => prev.filter((i) => i.item_id !== sellItem.item_id));
      setSellItem(null);
    } catch {
      addToast('Sale failed. Please try again.', 'error');
    } finally {
      setSelling(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const totalItems = badges.length + roles.length + items.length;

  // Not logged in
  if (user === null) {
    return (
      <Shell user={null}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
            style={{ background: 'rgba(88,101,242,0.12)', border: '2px solid rgba(88,101,242,0.3)' }}
          >
            🔒
          </div>
          <h1 className="text-2xl font-black mb-2" style={{ color: '#e2f4ff' }}>
            Login Required
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(168,255,246,0.6)' }}>
            Connect your Discord account to view your inventory.
          </p>
          <Link
            href="/auth/login"
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition-all hover:opacity-90"
            style={{ background: 'rgba(88,101,242,0.25)', border: '1px solid rgba(88,101,242,0.4)', color: '#7289da' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Login with Discord
          </Link>
        </div>
      </Shell>
    );
  }

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
                  🎒
                </div>
                <h1 className="text-2xl font-black" style={{ color: '#e2f4ff' }}>
                  My Inventory
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'rgba(168,255,246,0.6)' }}>
                Your badges, Discord roles, and purchased items.
              </p>
              {!loading && (
                <p className="text-xs mt-1" style={{ color: 'rgba(168,255,246,0.4)' }}>
                  {totalItems} item{totalItems !== 1 ? 's' : ''} total
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Balance */}
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <span className="text-lg">⭐</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(168,255,246,0.5)' }}>
                    Balance
                  </p>
                  <p className="text-sm font-black tabular-nums" style={{ color: '#f59e0b' }}>
                    {balance.toLocaleString()} SP
                  </p>
                </div>
              </div>

              <Link
                href="/shop"
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all hover:opacity-90"
                style={{ background: 'rgba(0,207,255,0.12)', border: '1px solid rgba(0,207,255,0.25)', color: '#00CFFF' }}
              >
                🛍️ Shop
              </Link>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === 'badges'}
            onClick={() => setActiveTab('badges')}
            icon="🏅"
            label="Badges"
            count={badges.length}
          />
          <TabButton
            active={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
            icon="👑"
            label="Discord Roles"
            count={roles.length}
          />
          <TabButton
            active={activeTab === 'items'}
            onClick={() => setActiveTab('items')}
            icon="🛍️"
            label="Items"
            count={items.length}
          />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse"
                style={{ background: 'rgba(6,43,69,0.6)', border: '1px solid rgba(0,207,255,0.08)' }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Badges Tab */}
            {activeTab === 'badges' && (
              <div>
                {badges.length === 0 ? (
                  <EmptyState
                    icon="🏅"
                    title="No badges yet"
                    message="Purchase badge items from the shop or earn them through gameplay."
                    actionHref="/shop"
                    actionLabel="Browse Shop"
                  />
                ) : (
                  <div className="space-y-2">
                    {badges.map((badge) => (
                      <InventoryItem key={badge.id} type="badge" badge={badge} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
              <div>
                {roles.length === 0 ? (
                  <EmptyState
                    icon="👑"
                    title="No Discord roles"
                    message="Purchase role items from the shop to unlock exclusive Discord roles."
                    actionHref="/shop"
                    actionLabel="Browse Shop"
                  />
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <InventoryItem key={role.id} type="role" role={role} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <div>
                {items.length === 0 ? (
                  <EmptyState
                    icon="🛍️"
                    title="No items yet"
                    message="Visit the shop to purchase cosmetics, boosts, and other items."
                    actionHref="/shop"
                    actionLabel="Browse Shop"
                  />
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <InventoryItem
                        key={item.id}
                        type="item"
                        item={item}
                        onSell={item.resale_percent > 0 ? (itemId) => {
                          const found = items.find((i) => i.item_id === itemId);
                          if (found) setSellItem(found);
                        } : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sell Confirm Modal ── */}
      {sellItem && (
        <SellConfirmModal
          item={sellItem}
          onConfirm={handleSell}
          onCancel={() => setSellItem(null)}
          loading={selling}
        />
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({
  icon,
  title,
  message,
  actionHref,
  actionLabel,
}: {
  icon: string;
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
      style={{ background: 'rgba(6,43,69,0.6)', border: '1px solid rgba(0,207,255,0.12)' }}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.15)' }}
      >
        {icon}
      </div>
      <p className="text-lg font-black" style={{ color: 'rgba(168,255,246,0.7)' }}>
        {title}
      </p>
      <p className="mt-1 text-sm max-w-xs" style={{ color: 'rgba(168,255,246,0.4)' }}>
        {message}
      </p>
      <Link
        href={actionHref}
        className="mt-5 rounded-xl px-5 py-2.5 text-sm font-black transition-all hover:opacity-90"
        style={{ background: 'rgba(0,207,255,0.15)', border: '1px solid rgba(0,207,255,0.3)', color: '#00CFFF' }}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
