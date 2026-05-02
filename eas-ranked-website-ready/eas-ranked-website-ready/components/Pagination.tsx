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
    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
      {totalItems !== undefined && itemsPerPage !== undefined && (
        <p className="text-sm text-zinc-500">
          Showing {Math.min((page - 1) * itemsPerPage + 1, totalItems)}–
          {Math.min(page * itemsPerPage, totalItems)} of {totalItems}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold disabled:opacity-30 hover:bg-purple-950/40 hover:border-purple-700 transition"
        >
          ← Prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-zinc-600">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                p === page
                  ? "border-purple-600 bg-purple-600 text-white"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:bg-purple-950/40 hover:border-purple-700"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold disabled:opacity-30 hover:bg-purple-950/40 hover:border-purple-700 transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
