'use client';

import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import SoundLink from '@/components/SoundLink';

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

interface PriceHistoryEntry {
  id: number;
  item_id: number;
  item_name: string | null;
  old_price: number;
  new_price: number;
  changed_by: string;
  reason: string | null;
  created_at: string;
}

interface AuditEntry {
  id: number;
  item_id: number | null;
  item_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  note: string | null;
  created_at: string;
}

interface ToastMsg {
  type: 'success' | 'error';
  text: string;
}

type ActiveTab = 'items' | 'price-history' | 'audit';

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const CATEGORIES = ['item', 'badge', 'role', 'cosmetic', 'boost', 'other'];

const RARITY_COLORS: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#10b981',
  rare: '#00d4ff',
  epic: '#a855f7',
  legendary: '#ff6b6b',
  mythic: '#ffd700',
};

const ACTION_COLORS: Record<string, { color: string; icon: string }> = {
  create: { color: '#10b981', icon: '➕' },
  update: { color: '#00d4ff', icon: '✏️' },
  delete: { color: '#ef4444', icon: '🗑️' },
  enable: { color: '#10b981', icon: '✅' },
  disable: { color: '#f59e0b', icon: '⏸️' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtPrice(n: number): string {
  return n.toLocaleString() + ' SP';
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ msg, onDismiss }: { msg: ToastMsg; onDismiss: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm ${
        msg.type === 'success'
          ? 'border-green-400/60 bg-green-950/90 text-green-300 shadow-green-900/40'
          : 'border-red-400/60 bg-red-950/90 text-red-300 shadow-red-900/40'
      }`}
    >
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition font-black text-base">✕</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  title, message, confirmLabel, confirmColor, onConfirm, onCancel, children,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
      >
        <h3 className="text-lg font-black text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-4">{message}</p>
        {children}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: confirmColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rarity Badge
// ---------------------------------------------------------------------------

function RarityBadge({ rarity }: { rarity: string }) {
  const color = RARITY_COLORS[rarity] ?? '#6b7280';
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
      style={{ background: `${color}22`, border: `1px solid ${color}60`, color }}
    >
      {rarity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Item Form (Create / Edit Modal)
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  name: '',
  description: '',
  price: 0,
  category: 'item',
  rarity: 'common',
  active: true,
  limited: false,
  max_stock: '',
  current_stock: '',
  min_value: '',
  max_value: '',
  resale_percent: 0,
  badge_id: '',
  role_id: '',
};

type FormState = typeof EMPTY_FORM;

function ItemFormModal({
  item,
  onSave,
  onCancel,
  saving,
}: {
  item: ShopItem | null;
  onSave: (data: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(() =>
    item
      ? {
          name: item.name,
          description: item.description ?? '',
          price: item.price,
          category: item.category,
          rarity: item.rarity,
          active: item.active,
          limited: item.limited,
          max_stock: item.max_stock != null ? String(item.max_stock) : '',
          current_stock: item.current_stock != null ? String(item.current_stock) : '',
          min_value: item.min_value != null ? String(item.min_value) : '',
          max_value: item.max_value != null ? String(item.max_value) : '',
          resale_percent: item.resale_percent,
          badge_id: item.badge_id ?? '',
          role_id: item.role_id ?? '',
        }
      : { ...EMPTY_FORM }
  );

  function set(field: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isEdit = item !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl my-4"
        style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white">
            {isEdit ? `✏️ Edit: ${item.name}` : '➕ Create Shop Item'}
          </h3>
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/10 transition"
          >
            ✕ Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Gold Investor Badge"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Short description of this item"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Price (SP) *</label>
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set('price', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Rarity */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Rarity</label>
            <select
              value={form.rarity}
              onChange={(e) => set('rarity', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Resale % */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Resale % (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.resale_percent}
              onChange={(e) => set('resale_percent', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Max Stock */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Max Stock</label>
            <input
              type="number"
              min={0}
              value={form.max_stock}
              onChange={(e) => set('max_stock', e.target.value)}
              placeholder="Leave blank for unlimited"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Current Stock */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Current Stock</label>
            <input
              type="number"
              min={0}
              value={form.current_stock}
              onChange={(e) => set('current_stock', e.target.value)}
              placeholder="Leave blank if not tracked"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Min Value */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Min Value (SP)</label>
            <input
              type="number"
              min={0}
              value={form.min_value}
              onChange={(e) => set('min_value', e.target.value)}
              placeholder="Optional floor price"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Max Value */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Max Value (SP)</label>
            <input
              type="number"
              min={0}
              value={form.max_value}
              onChange={(e) => set('max_value', e.target.value)}
              placeholder="Optional ceiling price"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Badge ID */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Badge ID</label>
            <input
              type="text"
              value={form.badge_id}
              onChange={(e) => set('badge_id', e.target.value)}
              placeholder="e.g. market_badge_gold"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-mono font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Role ID */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Role ID</label>
            <input
              type="text"
              value={form.role_id}
              onChange={(e) => set('role_id', e.target.value)}
              placeholder="Discord role ID"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-mono font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Toggles */}
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => set('active', !form.active)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${form.active ? 'bg-green-500' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.active ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-black text-zinc-300">Active</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => set('limited', !form.limited)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${form.limited ? 'bg-amber-500' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.limited ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-black text-zinc-300">Limited Edition</span>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div
          className="mt-5 flex items-center gap-4 rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: `${RARITY_COLORS[form.rarity] ?? '#6b7280'}22`,
              border: `2px solid ${RARITY_COLORS[form.rarity] ?? '#6b7280'}60`,
            }}
          >
            🛍️
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white truncate">{form.name || 'Item Name'}</p>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{form.description || 'No description'}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <RarityBadge rarity={form.rarity} />
              <span className="text-xs font-black text-yellow-400">{fmtPrice(form.price)}</span>
              {form.limited && (
                <span className="text-[10px] font-black text-amber-400 border border-amber-400/40 rounded-full px-2 py-0.5">LIMITED</span>
              )}
              {!form.active && (
                <span className="text-[10px] font-black text-zinc-500 border border-zinc-600 rounded-full px-2 py-0.5">DISABLED</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-3 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="flex-1 rounded-xl py-3 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            {saving ? '⟳ Saving…' : isEdit ? '✅ Save Changes' : '➕ Create Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Items Tab
// ---------------------------------------------------------------------------

function ItemsTab({ setToast }: { setToast: (t: ToastMsg | null) => void }) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterLimited, setFilterLimited] = useState('');

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editItem, setEditItem] = useState<ShopItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ShopItem | null>(null);
  const [toggleItem, setToggleItem] = useState<ShopItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterCategory) params.set('category', filterCategory);
      if (filterRarity) params.set('rarity', filterRarity);
      if (filterActive !== '') params.set('active', filterActive);
      if (filterLimited !== '') params.set('limited', filterLimited);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/shop/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterRarity, filterActive, filterLimited, search]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleCreate(form: FormState) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shop/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_stock: form.max_stock !== '' ? Number(form.max_stock) : null,
          current_stock: form.current_stock !== '' ? Number(form.current_stock) : null,
          min_value: form.min_value !== '' ? Number(form.min_value) : null,
          max_value: form.max_value !== '' ? Number(form.max_value) : null,
          badge_id: form.badge_id.trim() || null,
          role_id: form.role_id.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: 'success', text: `✅ "${data.item.name}" created successfully` });
        setCreateModal(false);
        loadItems();
      } else {
        setToast({ type: 'error', text: data.error ?? 'Failed to create item' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(form: FormState) {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/items/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_stock: form.max_stock !== '' ? Number(form.max_stock) : null,
          current_stock: form.current_stock !== '' ? Number(form.current_stock) : null,
          min_value: form.min_value !== '' ? Number(form.min_value) : null,
          max_value: form.max_value !== '' ? Number(form.max_value) : null,
          badge_id: form.badge_id.trim() || null,
          role_id: form.role_id.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: 'success', text: `✅ "${data.item.name}" updated successfully` });
        setEditItem(null);
        loadItems();
      } else {
        setToast({ type: 'error', text: data.error ?? 'Failed to update item' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/shop/items/${deleteItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: 'success', text: `🗑️ "${deleteItem.name}" deleted` });
        setDeleteItem(null);
        loadItems();
      } else {
        setToast({ type: 'error', text: data.error ?? 'Failed to delete item' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setActing(false);
    }
  }

  async function handleToggle() {
    if (!toggleItem || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/shop/items/${toggleItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !toggleItem.active }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({
          type: 'success',
          text: `${data.item.active ? '✅ Enabled' : '⏸️ Disabled'} "${data.item.name}"`,
        });
        setToggleItem(null);
        loadItems();
      } else {
        setToast({ type: 'error', text: data.error ?? 'Failed to toggle item' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Modals */}
      {(createModal || editItem) && (
        <ItemFormModal
          item={editItem}
          onSave={editItem ? handleEdit : handleCreate}
          onCancel={() => { setCreateModal(false); setEditItem(null); }}
          saving={saving}
        />
      )}

      {deleteItem && (
        <ConfirmModal
          title={`Delete "${deleteItem.name}"`}
          message={`Are you sure you want to permanently delete "${deleteItem.name}"? This cannot be undone.`}
          confirmLabel={acting ? '⟳ Deleting…' : '🗑️ Delete Item'}
          confirmColor="linear-gradient(135deg, #ef4444, #dc2626)"
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}

      {toggleItem && (
        <ConfirmModal
          title={toggleItem.active ? `Disable "${toggleItem.name}"` : `Enable "${toggleItem.name}"`}
          message={
            toggleItem.active
              ? `Disable "${toggleItem.name}"? It will no longer appear in the shop.`
              : `Enable "${toggleItem.name}"? It will become visible in the shop.`
          }
          confirmLabel={acting ? '⟳ Updating…' : toggleItem.active ? '⏸️ Disable' : '✅ Enable'}
          confirmColor={toggleItem.active ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)'}
          onConfirm={handleToggle}
          onCancel={() => setToggleItem(null)}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-9 pr-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
          />
        </div>

        {/* Filters */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>

        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        >
          <option value="">All Rarities</option>
          {RARITIES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </select>

        <select
          value={filterLimited}
          onChange={(e) => setFilterLimited(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        >
          <option value="">All Types</option>
          <option value="true">Limited</option>
          <option value="false">Unlimited</option>
        </select>

        <button
          onClick={loadItems}
          className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
        >
          ↻
        </button>

        <button
          onClick={() => setCreateModal(true)}
          className="rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          ➕ Create Item
        </button>
      </div>

      {/* Stats bar */}
      <p className="text-xs font-bold text-zinc-500">
        Showing {items.length} of {total} item{total !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}
      >
        {/* Header */}
        <div
          className="hidden md:grid px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/8"
          style={{ gridTemplateColumns: '2fr 80px 100px 80px 80px 80px 140px', gap: '0.75rem', background: 'rgba(255,255,255,0.02)' }}
        >
          <div>Item</div>
          <div>Price</div>
          <div>Rarity</div>
          <div>Stock</div>
          <div>Status</div>
          <div>Type</div>
          <div>Actions</div>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <p className="text-zinc-400 animate-pulse font-bold">Loading shop items…</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-zinc-500 font-bold">No shop items found</p>
            <p className="text-xs text-zinc-600 mt-1">Create your first item using the button above</p>
          </div>
        )}

        {!loading && items.map((item) => (
          <div
            key={item.id}
            className="grid px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center gap-3"
            style={{ gridTemplateColumns: '1fr' }}
          >
            {/* Mobile layout */}
            <div className="flex flex-col gap-2 md:hidden">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-white">{item.name}</p>
                  {item.description && <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <RarityBadge rarity={item.rarity} />
                    <span className="text-xs font-black text-yellow-400">{fmtPrice(item.price)}</span>
                    {item.limited && (
                      <span className="text-[10px] font-black text-amber-400 border border-amber-400/40 rounded-full px-2 py-0.5">LIMITED</span>
                    )}
                    {!item.active && (
                      <span className="text-[10px] font-black text-zinc-500 border border-zinc-600 rounded-full px-2 py-0.5">DISABLED</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setEditItem(item)}
                  className="rounded-lg border border-cyan-700/40 bg-cyan-950/20 px-3 py-1.5 text-xs font-black text-cyan-400 hover:bg-cyan-500/20 transition-all"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => setToggleItem(item)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-black transition-all ${
                    item.active
                      ? 'border-amber-700/40 bg-amber-950/20 text-amber-400 hover:bg-amber-500/20'
                      : 'border-green-700/40 bg-green-950/20 text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  {item.active ? '⏸️ Disable' : '✅ Enable'}
                </button>
                <button
                  onClick={() => setDeleteItem(item)}
                  className="rounded-lg border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 transition-all"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* Desktop layout */}
            <div
              className="hidden md:grid items-center gap-3"
              style={{ gridTemplateColumns: '2fr 80px 100px 80px 80px 80px 140px' }}
            >
              <div className="min-w-0">
                <p className="font-black text-white truncate">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{item.description}</p>
                )}
                <p className="text-[10px] font-mono text-zinc-600 mt-0.5">#{item.id} · {item.category}</p>
              </div>
              <div className="font-black text-yellow-400 text-sm">{fmtPrice(item.price)}</div>
              <div><RarityBadge rarity={item.rarity} /></div>
              <div className="text-xs font-bold text-zinc-400">
                {item.limited
                  ? `${item.current_stock ?? '?'} / ${item.max_stock ?? '∞'}`
                  : '∞'}
              </div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                    item.active
                      ? 'bg-green-500/15 border border-green-500/40 text-green-400'
                      : 'bg-zinc-700/30 border border-zinc-600 text-zinc-500'
                  }`}
                >
                  {item.active ? '● Active' : '○ Off'}
                </span>
              </div>
              <div>
                {item.limited && (
                  <span className="text-[10px] font-black text-amber-400 border border-amber-400/40 rounded-full px-2 py-0.5">LIMITED</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditItem(item)}
                  className="rounded-lg border border-cyan-700/40 bg-cyan-950/20 px-2.5 py-1.5 text-xs font-black text-cyan-400 hover:bg-cyan-500/20 transition-all"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setToggleItem(item)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition-all ${
                    item.active
                      ? 'border-amber-700/40 bg-amber-950/20 text-amber-400 hover:bg-amber-500/20'
                      : 'border-green-700/40 bg-green-950/20 text-green-400 hover:bg-green-500/20'
                  }`}
                  title={item.active ? 'Disable' : 'Enable'}
                >
                  {item.active ? '⏸️' : '✅'}
                </button>
                <button
                  onClick={() => setDeleteItem(item)}
                  className="rounded-lg border border-red-700/40 bg-red-950/20 px-2.5 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 transition-all"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price History Tab
// ---------------------------------------------------------------------------

function PriceHistoryTab() {
  const [entries, setEntries] = useState<PriceHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterItemId, setFilterItemId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterItemId.trim()) params.set('item_id', filterItemId.trim());
      if (filterDateFrom) params.set('date_from', filterDateFrom);
      if (filterDateTo) params.set('date_to', filterDateTo);

      const res = await fetch(`/api/admin/shop/price-history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filterItemId, filterDateFrom, filterDateTo]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={filterItemId}
          onChange={(e) => setFilterItemId(e.target.value)}
          placeholder="Filter by Item ID…"
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition w-40"
        />
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        />
        <span className="text-zinc-500 text-sm font-bold">→</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        />
        {(filterItemId || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterItemId(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
          >
            ✕ Clear
          </button>
        )}
        <button
          onClick={loadHistory}
          className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
        >
          ↻
        </button>
      </div>

      <p className="text-xs font-bold text-zinc-500">{total} price change{total !== 1 ? 's' : ''} recorded</p>

      <div
        className="rounded-3xl overflow-hidden"
        style={{ border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}
      >
        <div
          className="hidden md:grid px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/8"
          style={{ gridTemplateColumns: '2fr 100px 100px 1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}
        >
          <div>Item</div>
          <div>Old Price</div>
          <div>New Price</div>
          <div>Changed By</div>
          <div>When / Reason</div>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <p className="text-zinc-400 animate-pulse font-bold">Loading price history…</p>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">📈</p>
            <p className="text-zinc-500 font-bold">No price history found</p>
            <p className="text-xs text-zinc-600 mt-1">Price changes will appear here when items are updated</p>
          </div>
        )}

        {!loading && entries.map((entry) => {
          const diff = entry.new_price - entry.old_price;
          const isIncrease = diff > 0;
          return (
            <div
              key={entry.id}
              className="grid px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center text-sm"
              style={{ gridTemplateColumns: '1fr' }}
            >
              {/* Mobile */}
              <div className="md:hidden space-y-1">
                <p className="font-black text-white">{entry.item_name ?? `Item #${entry.item_id}`}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 line-through">{fmtPrice(entry.old_price)}</span>
                  <span>→</span>
                  <span className={`font-black ${isIncrease ? 'text-red-400' : 'text-green-400'}`}>
                    {fmtPrice(entry.new_price)}
                  </span>
                  <span className={`text-[10px] font-black ${isIncrease ? 'text-red-400' : 'text-green-400'}`}>
                    ({isIncrease ? '+' : ''}{diff.toLocaleString()})
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{fmt(entry.created_at)} · by {entry.changed_by}</p>
                {entry.reason && <p className="text-xs text-zinc-600">{entry.reason}</p>}
              </div>

              {/* Desktop */}
              <div
                className="hidden md:grid items-center gap-4"
                style={{ gridTemplateColumns: '2fr 100px 100px 1fr 1fr' }}
              >
                <div>
                  <p className="font-black text-white">{entry.item_name ?? `Item #${entry.item_id}`}</p>
                  <p className="text-[10px] font-mono text-zinc-600">ID: {entry.item_id}</p>
                </div>
                <div className="font-bold text-zinc-400 text-sm">{fmtPrice(entry.old_price)}</div>
                <div>
                  <span className={`font-black text-sm ${isIncrease ? 'text-red-400' : 'text-green-400'}`}>
                    {fmtPrice(entry.new_price)}
                  </span>
                  <span className={`ml-1 text-[10px] font-black ${isIncrease ? 'text-red-400' : 'text-green-400'}`}>
                    ({isIncrease ? '+' : ''}{diff.toLocaleString()})
                  </span>
                </div>
                <div className="font-mono text-xs text-zinc-400 truncate">{entry.changed_by}</div>
                <div>
                  <p className="text-xs text-zinc-500">{fmt(entry.created_at)}</p>
                  {entry.reason && <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{entry.reason}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Log Tab
// ---------------------------------------------------------------------------

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterItemId, setFilterItemId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterAction) params.set('action', filterAction);
      if (filterItemId.trim()) params.set('item_id', filterItemId.trim());
      if (filterUserId.trim()) params.set('user_id', filterUserId.trim());
      if (filterDateFrom) params.set('date_from', filterDateFrom);
      if (filterDateTo) params.set('date_to', filterDateTo);

      const res = await fetch(`/api/admin/shop/audit-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterItemId, filterUserId, filterDateFrom, filterDateTo]);

  useEffect(() => { loadLog(); }, [loadLog]);

  function clearFilters() {
    setFilterAction('');
    setFilterItemId('');
    setFilterUserId('');
    setFilterDateFrom('');
    setFilterDateTo('');
  }

  const hasFilters = filterAction || filterItemId || filterUserId || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="enable">Enable</option>
          <option value="disable">Disable</option>
        </select>

        <input
          type="text"
          value={filterItemId}
          onChange={(e) => setFilterItemId(e.target.value)}
          placeholder="Item ID…"
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition w-28"
        />

        <input
          type="text"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          placeholder="User ID…"
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition w-44"
        />

        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        />
        <span className="text-zinc-500 text-sm font-bold">→</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
          >
            ✕ Clear
          </button>
        )}
        <button
          onClick={loadLog}
          className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
        >
          ↻
        </button>
      </div>

      <p className="text-xs font-bold text-zinc-500">{total} audit log entr{total !== 1 ? 'ies' : 'y'}</p>

      <div
        className="rounded-3xl overflow-hidden"
        style={{ border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}
      >
        <div
          className="hidden md:grid px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/8"
          style={{ gridTemplateColumns: '80px 1fr 100px 100px 100px 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}
        >
          <div>Action</div>
          <div>Item</div>
          <div>Field</div>
          <div>Old Value</div>
          <div>New Value</div>
          <div>By / When</div>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <p className="text-zinc-400 animate-pulse font-bold">Loading audit log…</p>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-zinc-500 font-bold">No audit log entries found</p>
          </div>
        )}

        {!loading && entries.map((entry) => {
          const style = ACTION_COLORS[entry.action] ?? { color: '#6b7280', icon: '•' };
          return (
            <div
              key={entry.id}
              className="px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors text-sm"
            >
              {/* Mobile */}
              <div className="md:hidden space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black"
                    style={{ background: `${style.color}22`, border: `1px solid ${style.color}50`, color: style.color }}
                  >
                    {style.icon} {entry.action}
                  </span>
                  <span className="font-black text-white truncate">{entry.item_name ?? `Item #${entry.item_id}`}</span>
                </div>
                {entry.field && (
                  <p className="text-xs text-zinc-500">
                    <span className="font-mono">{entry.field}</span>: {entry.old_value ?? '—'} → {entry.new_value ?? '—'}
                  </p>
                )}
                {entry.note && <p className="text-xs text-zinc-600">{entry.note}</p>}
                <p className="text-xs text-zinc-500">{fmt(entry.created_at)} · by {entry.changed_by}</p>
              </div>

              {/* Desktop */}
              <div
                className="hidden md:grid items-center gap-4"
                style={{ gridTemplateColumns: '80px 1fr 100px 100px 100px 1fr' }}
              >
                <div>
                  <span
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black"
                    style={{ background: `${style.color}22`, border: `1px solid ${style.color}50`, color: style.color }}
                  >
                    {style.icon} {entry.action}
                  </span>
                </div>
                <div>
                  <p className="font-black text-white truncate">{entry.item_name ?? `Item #${entry.item_id}`}</p>
                  {entry.note && <p className="text-[11px] text-zinc-600 truncate">{entry.note}</p>}
                </div>
                <div className="font-mono text-xs text-zinc-400 truncate">{entry.field ?? '—'}</div>
                <div className="text-xs text-zinc-500 truncate">{entry.old_value ?? '—'}</div>
                <div className="text-xs text-zinc-300 truncate">{entry.new_value ?? '—'}</div>
                <div>
                  <p className="font-mono text-xs text-zinc-400 truncate">{entry.changed_by}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{fmt(entry.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MarketShopAdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('items');
  const [toast, setToast] = useState<ToastMsg | null>(null);

  // Auth check — only Discord user ID 733871667788644445 may access this page
  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Auto-dismiss success toasts
  useEffect(() => {
    if (toast?.type === 'success') {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse font-bold">Checking access…</p>
        </div>
      </Shell>
    );
  }

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

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'items', label: 'Shop Items', icon: '🛍️' },
    { id: 'price-history', label: 'Price History', icon: '📈' },
    { id: 'audit', label: 'Audit Log', icon: '📋' },
  ];

  return (
    <Shell>
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative mb-8 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a14 0%, #0d0d1a 40%, #0a0a14 100%)',
          border: '2px solid rgba(16,185,129,0.30)',
          boxShadow: '0 0 80px rgba(16,185,129,0.08), 0 0 40px rgba(0,212,255,0.06)',
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10b981, transparent)', transform: 'translate(-30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ffd700, transparent)', transform: 'translate(30%, 30%)' }}
        />

        <div className="relative px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 20px rgba(16,185,129,0.80))' }}>
              🛍️
            </span>
            <div>
              <h1
                className="text-4xl font-black tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(90deg, #10b981, #ffd700, #00D4FF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.40))',
                }}
              >
                MARKET SHOP MANAGER
              </h1>
              <p className="text-sm font-bold text-zinc-400 mt-1">
                🔐 Developer Access Only — Manage Market Shop Items, Prices &amp; Audit Log
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.40)', color: '#10b981' }}>
              🛍️ market_shop_items
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black"
              style={{ background: 'rgba(0,212,255,0.12)', border: '1.5px solid rgba(0,212,255,0.40)', color: '#00d4ff' }}>
              📋 market_shop_audit
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black"
              style={{ background: 'rgba(255,215,0,0.12)', border: '1.5px solid rgba(255,215,0,0.40)', color: '#ffd700' }}>
              📈 price_history
            </span>
          </div>
        </div>
      </div>

      {/* ─── Tab Switcher ────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-black border-2 transition-all active:scale-95 ${
              activeTab === tab.id
                ? 'border-green-400/60 bg-green-950/30 text-green-300 shadow-[0_0_16px_rgba(16,185,129,0.20)]'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────────── */}
      {activeTab === 'items' && <ItemsTab setToast={setToast} />}
      {activeTab === 'price-history' && <PriceHistoryTab />}
      {activeTab === 'audit' && <AuditLogTab />}
    </Shell>
  );
}
