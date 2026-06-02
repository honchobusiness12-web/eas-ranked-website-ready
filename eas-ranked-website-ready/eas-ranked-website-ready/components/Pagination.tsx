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
        <p className="text-xs font-medium" style={{ color: "rgba(168,255,246,0.50)" }}>
          {Math.min((page - 1) * itemsPerPage + 1, totalItems)}–{Math.min(page * itemsPerPage, totalItems)} of {totalItems.toLocaleString()}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-25"
          style={{ border: "1px solid rgba(0,207,255,0.22)", background: "rgba(0,207,255,0.08)", color: "#00CFFF" }}
        >
          ← Prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs" style={{ color: "rgba(168,255,246,0.40)" }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200"
              style={p === page
                ? { border: "1px solid rgba(0,207,255,0.45)", background: "rgba(0,207,255,0.18)", color: "#00CFFF", boxShadow: "0 0 12px rgba(0,207,255,0.20)" }
                : { border: "1px solid rgba(0,207,255,0.12)", background: "rgba(0,207,255,0.05)", color: "rgba(168,255,246,0.60)" }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 disabled:opacity-25"
          style={{ border: "1px solid rgba(0,207,255,0.22)", background: "rgba(0,207,255,0.08)", color: "#00CFFF" }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
