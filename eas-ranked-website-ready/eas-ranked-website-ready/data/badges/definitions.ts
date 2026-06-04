import manifest from './manifest.json';

export interface BadgeDefinition {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  category: 'staff' | 'owner' | 'developer' | 'content_creator' | 'investor' | 'market' | 'event' | 'custom';
  description: string;
  color: string;
  stackable: boolean;
  source: 'admin' | 'market' | 'event' | 'custom';
  price?: number;
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = manifest.badges as Record<string, BadgeDefinition>;

export const RARITY_COLORS: Record<string, string> = {
  common: '#6b7280',
  uncommon: '#10b981',
  rare: '#00d4ff',
  epic: '#a855f7',
  legendary: '#ff6b6b',
  mythic: '#ffd700',
};

export const CATEGORY_LABELS: Record<string, string> = {
  staff: '👮 Staff',
  owner: '👑 Owner',
  developer: '💻 Developer',
  content_creator: '🎬 Content Creator',
  investor: '💰 Investor',
  market: '🛍️ Market',
  event: '🎉 Event',
  custom: '✨ Custom',
};

export function getBadgeDefinition(badgeId: string): BadgeDefinition | null {
  return BADGE_DEFINITIONS[badgeId] || null;
}

export function getBadgesByCategory(category: string): BadgeDefinition[] {
  return Object.values(BADGE_DEFINITIONS).filter(b => b.category === category);
}

export function getBadgesByRarity(rarity: string): BadgeDefinition[] {
  return Object.values(BADGE_DEFINITIONS).filter(b => b.rarity === rarity);
}
