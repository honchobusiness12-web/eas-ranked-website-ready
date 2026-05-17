interface PremiumBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Gold gradient "💎 Premium" badge shown on premium user profiles,
 * leaderboard rows, and anywhere else a premium indicator is needed.
 */
export default function PremiumBadge({ size = "md", className = "" }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
    lg: "px-4 py-1.5 text-sm gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-xl font-black tracking-wide transition-all duration-200 hover:scale-[1.03] ${sizeClasses} ${className}`}
      style={{
        background: "linear-gradient(135deg, #FFD700, #FF9F43, #FF6B6B)",
        color: "#fff",
        boxShadow: "0 0 14px rgba(255,215,0,0.4), 0 0 30px rgba(255,159,67,0.15)",
        textShadow: "0 1px 2px rgba(0,0,0,0.4)",
      }}
      title="Premium Member"
    >
      💎 Premium
    </span>
  );
}
