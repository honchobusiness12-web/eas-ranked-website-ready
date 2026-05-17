// Skeleton loader components — pure CSS shimmer, no dependencies

function SkeletonBase({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.05] ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d0d14] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBase className="h-3.5 w-28" />
          <SkeletonBase className="h-2.5 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <SkeletonBase className="h-10" />
        <SkeletonBase className="h-10" />
        <SkeletonBase className="h-10" />
        <SkeletonBase className="h-10" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="grid grid-cols-[44px_1fr_120px_90px_100px] items-center border-b border-white/[0.05] px-4 py-3 gap-3">
      <SkeletonBase className="h-4 w-7" />
      <div className="flex items-center gap-2.5">
        <SkeletonBase className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonBase className="h-3 w-24" />
          <SkeletonBase className="h-2.5 w-16" />
        </div>
      </div>
      <SkeletonBase className="h-5 w-20" />
      <SkeletonBase className="h-4 w-12 ml-auto" />
      <SkeletonBase className="h-4 w-12 ml-auto" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d0d14] p-3.5 space-y-2">
      <SkeletonBase className="h-2.5 w-20" />
      <SkeletonBase className="h-6 w-14" />
      <SkeletonBase className="h-2.5 w-16" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d14] p-4 space-y-3">
      <SkeletonBase className="h-4 w-36" />
      <SkeletonBase className="h-40 w-full" />
    </div>
  );
}

export function SkeletonCardsGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d14] overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
