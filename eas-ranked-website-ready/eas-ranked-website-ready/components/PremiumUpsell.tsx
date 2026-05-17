/**
 * PremiumUpsell — premium features have been removed from EAS Ranked.
 * This component is kept as a no-op to avoid breaking any remaining imports.
 */
interface PremiumUpsellProps {
  message?: string;
  compact?: boolean;
}

export default function PremiumUpsell(_props: PremiumUpsellProps) {
  return null;
}
