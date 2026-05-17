"use client";

import React, { useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  emptyIcon?: string;
  className?: string;
  /** Accent colour for the header gradient */
  accent?: "purple" | "blue" | "gold";
  onSort?: (key: string, dir: "asc" | "desc") => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}

const accentGradients: Record<string, string> = {
  purple: "linear-gradient(90deg, rgba(124,58,237,0.07), transparent)",
  blue:   "linear-gradient(90deg, rgba(79,142,247,0.07), transparent)",
  gold:   "linear-gradient(90deg, rgba(255,215,0,0.07), transparent)",
};

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data found",
  emptyIcon = "🔍",
  className = "",
  accent = "purple",
  onSort,
  sortKey,
  sortDir,
}: DataTableProps<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<"asc" | "desc">("desc");

  const activeSortKey = sortKey ?? internalSortKey;
  const activeSortDir = sortDir ?? internalSortDir;

  function handleSort(key: string) {
    const newDir =
      activeSortKey === key && activeSortDir === "desc" ? "asc" : "desc";
    if (onSort) {
      onSort(key, newDir);
    } else {
      setInternalSortKey(key);
      setInternalSortDir(newDir);
    }
  }

  const sortIcon = (key: string) => {
    if (activeSortKey !== key) return " ↕";
    return activeSortDir === "desc" ? " ↓" : " ↑";
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm ${className}`}
      style={{ background: "rgba(9,9,25,0.85)" }}
    >
      {/* Header row */}
      <div
        className="hidden md:grid items-center border-b border-white/[0.06] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-700"
        style={{
          background: accentGradients[accent],
          gridTemplateColumns: columns.map(() => "1fr").join(" "),
        }}
      >
        {columns.map((col) =>
          col.sortable ? (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className={`text-left transition-colors hover:text-purple-400 ${col.headerClassName ?? ""}`}
            >
              {col.header}
              <span className="opacity-50">{sortIcon(col.key)}</span>
            </button>
          ) : (
            <span key={col.key} className={col.headerClassName ?? ""}>
              {col.header}
            </span>
          )
        )}
      </div>

      {/* Body */}
      {data.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-4xl mb-4">{emptyIcon}</p>
          <p className="text-zinc-400 text-base font-black">{emptyMessage}</p>
        </div>
      ) : (
        data.map((row, index) => (
          <div
            key={keyExtractor(row)}
            className="hidden md:grid items-center border-b border-white/[0.04] px-6 py-4 transition-all duration-200 hover:bg-purple-500/[0.04] last:border-0"
            style={{
              gridTemplateColumns: columns.map(() => "1fr").join(" "),
            }}
          >
            {columns.map((col) => (
              <div key={col.key} className={col.className ?? ""}>
                {col.render(row, index)}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
