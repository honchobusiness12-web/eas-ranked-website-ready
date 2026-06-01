// SkeletonLoader — named skeleton components for each content type.
// All use the .skeleton-v2 CSS class (shimmer animation defined in globals.css).

function SkeletonBase({ className }: { className?: string }) {
  return (
    <div
      className={`skeleton-v2 ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a dashboard stat card */
export function StatCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] px-4 py-4 space-y-3"
      style={{ background: "rgba(10,10,28,0.85)" }}
    >
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-2.5 w-24 rounded-md" />
        <SkeletonBase className="h-8 w-8 rounded-xl" />
      </div>
      <SkeletonBase className="h-8 w-20 rounded-lg" />
      <SkeletonBase className="h-2.5 w-16 rounded-md" />
    </div>
  );
}

/** Skeleton for a leaderboard / player table row */
export function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-[44px_1fr_120px_90px_90px] items-center border-b border-white/[0.04] px-5 py-3.5 gap-3">
      <SkeletonBase className="h-4 w-7 rounded-md" />
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonBase className="h-3.5 w-24 rounded-md" />
          <SkeletonBase className="h-2.5 w-16 rounded-md" />
        </div>
      </div>
      <SkeletonBase className="h-5 w-20 rounded-lg" />
      <SkeletonBase className="h-4 w-12 ml-auto rounded-md" />
      <SkeletonBase className="h-4 w-12 ml-auto rounded-md" />
    </div>
  );
}

/** Skeleton for a player profile page */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-20 w-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <SkeletonBase className="h-6 w-40 rounded-lg" />
          <SkeletonBase className="h-4 w-28 rounded-md" />
          <SkeletonBase className="h-5 w-20 rounded-full" />
        </div>
      </div>
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] px-4 py-4 space-y-2"
            style={{ background: "rgba(10,10,28,0.85)" }}
          >
            <SkeletonBase className="h-2.5 w-16 rounded-md" />
            <SkeletonBase className="h-7 w-12 rounded-lg" />
          </div>
        ))}
      </div>
      {/* Chart */}
      <ChartSkeleton />
    </div>
  );
}

/** Skeleton for a chart / graph area */
export function ChartSkeleton() {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] p-5 space-y-3"
      style={{ background: "rgba(10,10,28,0.85)" }}
    >
      <SkeletonBase className="h-4 w-36 rounded-md" />
      <SkeletonBase className="h-44 w-full rounded-xl" />
    </div>
  );
}

/** Full leaderboard table skeleton */
export function LeaderboardSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ background: "rgba(10,10,28,0.85)" }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Grid of stat card skeletons */
export function StatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
