// Skeleton loader components — pure CSS shimmer, no dependencies
// Uses CSS variable overrides from theme.css for light/dark mode

function SkeletonBase({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBase className="h-4 w-32" />
          <SkeletonBase className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBase className="h-14" />
        <SkeletonBase className="h-14" />
        <SkeletonBase className="h-14" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="grid grid-cols-[60px_1fr_120px_100px_100px] items-center border-b border-white/10 px-6 py-4 gap-4">
      <SkeletonBase className="h-5 w-8" />
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-28" />
          <SkeletonBase className="h-3 w-20" />
        </div>
      </div>
      <SkeletonBase className="h-6 w-24" />
      <SkeletonBase className="h-5 w-16 ml-auto" />
      <SkeletonBase className="h-5 w-16 ml-auto" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-3">
      <SkeletonBase className="h-3 w-24" />
      <SkeletonBase className="h-8 w-16" />
      <SkeletonBase className="h-3 w-20" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 space-y-4">
      <SkeletonBase className="h-5 w-40" />
      <SkeletonBase className="h-48 w-full" />
    </div>
  );
}

export function SkeletonCardsGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14]">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
