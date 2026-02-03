/**
 * Full badge collection grid showing earned and locked badges.
 *
 * Earned badges display in full color with rarity accents.
 * Locked badges show as grayscale silhouettes with criteria hints.
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
import { Card, Skeleton } from '@/shared/ui';
import { useUserBadges } from '../hooks/useUserBadges';
import { cn } from '@/shared/lib/cn';
import type { BadgeDefinition, EarnedBadge } from '@/shared/data/badges';

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

function EarnedBadgeItem({ badge }: { badge: EarnedBadge }) {
  const Icon = iconMap[badge.icon] ?? Trophy;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full border-2 bg-surface-secondary',
          rarityBorder[badge.rarity],
        )}
      >
        <Icon className={cn('h-5 w-5', rarityText[badge.rarity])} />
      </div>
      <span className="text-center text-xs text-text-secondary leading-tight">
        {badge.name}
      </span>
    </div>
  );
}

function LockedBadgeItem({ badge }: { badge: BadgeDefinition }) {
  const Icon = iconMap[badge.icon] ?? Trophy;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-surface-secondary bg-surface-secondary opacity-40">
        <Icon className="h-5 w-5 text-text-hint grayscale" />
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

export function BadgeCollection() {
  const { allBadges, earned, earnedCount, totalCount, isLoading, isError } =
    useUserBadges();

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Badges</h2>
        <span className="text-xs text-text-hint">
          {earnedCount}/{totalCount}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="py-4 text-center text-sm text-text-hint">
          Unable to load badges
        </p>
      ) : earnedCount === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-text-hint">
            Start your training journey to earn badges!
          </p>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {allBadges.map((badge) => (
              <LockedBadgeItem key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {allBadges.map((badge) => {
            const earnedBadge = earned.find((e) => e.id === badge.id);
            return earnedBadge ? (
              <EarnedBadgeItem key={badge.id} badge={earnedBadge} />
            ) : (
              <LockedBadgeItem key={badge.id} badge={badge} />
            );
          })}
        </div>
      )}
    </Card>
  );
}
