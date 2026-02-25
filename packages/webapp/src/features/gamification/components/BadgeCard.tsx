/**
 * Individual badge card with rarity-tier styling and earned/locked states.
 *
 * Earned badges display full-color with rarity-accented borders, a glow
 * effect for epic/legendary tiers, and an "Earned" label.
 * Locked badges display at reduced opacity with grayscale icons and
 * criteria description hints.
 */

import {
  Trophy,
  Flame,
  Star,
  Target,
  Zap,
  Shield,
  Gem,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { BadgeDefinition } from '@/shared/data/badges';

/** Map badge icon names to lucide components */
const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  target: Target,
  zap: Zap,
  shield: Shield,
  gem: Gem,
};

/** Rarity border color classes */
const rarityBorder: Record<string, string> = {
  common: 'border-rarity-common',
  rare: 'border-rarity-rare',
  epic: 'border-rarity-epic',
  legendary: 'border-rarity-legendary',
};

/** Rarity icon color classes */
const rarityText: Record<string, string> = {
  common: 'text-rarity-common',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
};

/** Rarity glow shadows for epic and legendary tiers */
const rarityGlow: Record<string, string> = {
  epic: 'shadow-[0_0_4px_var(--color-rarity-epic)]',
  legendary: 'shadow-[0_0_8px_var(--color-rarity-legendary)]',
};

/** Rarity display names */
const rarityLabel: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

interface BadgeCardProps {
  badge: BadgeDefinition;
  earned: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export function BadgeCard({ badge, earned, rarity }: BadgeCardProps) {
  const Icon = iconMap[badge.icon] ?? Trophy;

  if (earned) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border-2 bg-surface-secondary',
            rarityBorder[rarity],
            rarityGlow[rarity],
            'badge-earned-pulse',
          )}
        >
          <Icon className={cn('h-6 w-6', rarityText[rarity])} />
        </div>
        <span className="text-center text-xs font-medium text-text-primary leading-tight">
          {badge.name}
        </span>
        <span
          className={cn(
            'text-[10px] font-medium leading-tight',
            rarityText[rarity],
          )}
        >
          {rarityLabel[rarity]}
        </span>
        <span className="text-[10px] text-success leading-tight">Earned</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 opacity-30">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-surface-secondary bg-surface-secondary">
        <Icon className="h-6 w-6 text-text-hint grayscale" />
      </div>
      <span className="text-center text-xs text-text-hint leading-tight">
        {badge.name}
      </span>
      <span className="text-center text-[10px] text-text-hint leading-tight">
        {badge.description}
      </span>
    </div>
  );
}
