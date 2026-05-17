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
    <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
      {totalItems !== undefined && itemsPerPage !== undefined && (
        <p className="text-xs text-zinc-600">
          {Math.min((page - 1) * itemsPerPage + 1, totalItems)}–{Math.min(page * itemsPerPage, totalItems)} of {totalItems}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold disabled:opacity-30 hover:bg-orange-950/30 hover:border-orange-600/60 transition-colors"
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-zinc-700">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                p === page
                  ? "border-orange-500 bg-gradient-to-r from-orange-500 to-red-500 text-white"
                  : "border-white/10 bg-white/5 text-zinc-500 hover:bg-orange-950/30 hover:border-orange-600/60 hover:text-white"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold disabled:opacity-30 hover:bg-orange-950/30 hover:border-orange-600/60 transition-colors"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
