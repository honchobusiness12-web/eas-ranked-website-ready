"use client";

import { useState, useTransition } from "react";
import { searchPlayers } from "@/lib/admin-actions";
import type { PlayerData } from "@/lib/admin-actions";

interface Props {
  onSelect: (player: PlayerData) => void;
  selectedId?: string | null;
}

export default function PlayerSearch({ onSelect, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerData[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearched(false);
    startTransition(async () => {
      const res = await searchPlayers(query);
      if (res.success && res.data) {
        setResults(res.data.players);
        setTotal(res.data.total);
      } else {
        setResults([]);
        setTotal(0);
      }
      setSearched(true);
    });
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setTotal(0);
    setSearched(false);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or Discord ID…"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-red-600/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-black text-white hover:from-red-500 hover:to-rose-500 transition-all disabled:opacity-50"
        >
          {isPending ? "…" : "Search"}
        </button>
        {(query || searched) && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/5 transition"
          >
            Clear
          </button>
        )}
      </form>

      {searched && (
        <p className="text-xs text-zinc-500">
          {total.toLocaleString()} player{total !== 1 ? "s" : ""} found
        </p>
      )}

      {results.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-right">CR</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map((p) => (
                  <tr
                    key={p.user_id}
                    className={`hover:bg-white/[0.03] transition ${
                      selectedId === p.user_id ? "bg-white/[0.05]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-[10px] font-mono text-zinc-600">{p.user_id}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-orange-400">
                      {p.cr.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.blacklisted ? (
                        <span className="rounded-md bg-red-950/40 border border-red-700/40 px-2 py-0.5 text-[10px] font-black text-red-400">
                          BANNED
                        </span>
                      ) : p.ranked ? (
                        <span className="rounded-md bg-green-950/40 border border-green-700/40 px-2 py-0.5 text-[10px] font-black text-green-400">
                          RANKED
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-900 border border-white/5 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                          UNRANKED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelect(p)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition"
                      >
                        Select →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-8 text-center text-zinc-500 text-sm">
          No players found.
        </div>
      )}
    </div>
  );
}
