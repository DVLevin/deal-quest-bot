/**
 * Dashboard badge preview -- shows last 4 earned badges.
 *
 * Uses a static icon map for rendering lucide icons from badge definitions.
 * "See all" link navigates to /profile for the full badge collection.
 */

import { Link } from 'react-router';
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
import { Card, Skeleton, ErrorCard } from '@/shared/ui';
import { useRecentBadges } from '../hooks/useRecentBadges';
import { cn } from '@/shared/lib/cn';
import type { EarnedBadge } from '@/shared/data/badges';

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

/** Rarity color classes using design system tokens */
const rarityBorder: Record<string, string> = {
  common: 'border-rarity-common',
  rare: 'border-rarity-rare',
  epic: 'border-rarity-epic',
  legendary: 'border-rarity-legendary',
};

const rarityText: Record<string, string> = {
  common: 'text-rarity-common',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
};

function BadgeItem({ badge }: { badge: EarnedBadge }) {
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

export function BadgePreview() {
  const { data, isLoading, isError, refetch } = useRecentBadges();

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Badges</h2>
        <Link to="/profile" className="text-xs text-link">
          See all
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-around">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorCard message="Unable to load badges" onRetry={refetch} compact />
      ) : !data || data.earned.length === 0 ? (
        <p className="text-sm text-text-hint">
          No badges earned yet -- start training!
        </p>
      ) : (
        <div className="flex justify-around">
          {data.earned.slice(0, 4).map((badge) => (
            <BadgeItem key={badge.id} badge={badge} />
          ))}
        </div>
      )}
    </Card>
  );
}
