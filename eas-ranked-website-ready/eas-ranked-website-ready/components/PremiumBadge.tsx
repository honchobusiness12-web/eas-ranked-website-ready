/**
 * PremiumBadge — premium features have been removed from EAS Ranked.
 * This component is kept as a no-op to avoid breaking any remaining imports.
 */
interface PremiumBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function PremiumBadge(_props: PremiumBadgeProps) {
  return null;
}
