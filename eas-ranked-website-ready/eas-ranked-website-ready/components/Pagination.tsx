"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page number array with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      {totalItems !== undefined && itemsPerPage !== undefined && (
        <p className="text-xs text-zinc-600">
          {Math.min((page - 1) * itemsPerPage + 1, totalItems)}–{Math.min(page * itemsPerPage, totalItems)} of {totalItems.toLocaleString()}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-zinc-400 disabled:opacity-30 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          ← Prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-zinc-700 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                p === page
                  ? "border-orange-500/50 bg-orange-500/20 text-orange-300"
                  : "border-white/[0.07] bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-zinc-400 disabled:opacity-30 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
