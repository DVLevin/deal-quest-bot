/**
 * Badge Wall -- full visual grid of all badges with rarity-tier styling.
 *
 * Displays all 8 badge definitions in a 3-column grid. Earned badges
 * render with full-color rarity accents and glow effects. Locked badges
 * render as grayscale silhouettes with criteria hints.
 *
 * Uses the useUserBadges() hook for badge evaluation data (same query key
 * as Dashboard's BadgePreview, so TanStack Query deduplicates the request).
 */

import { Card, Skeleton, ErrorCard } from '@/shared/ui';
import { useUserBadges } from '@/features/profile/hooks/useUserBadges';
import { BadgeCard } from './BadgeCard';

export function BadgeWall() {
  const { allBadges, earned, earnedCount, totalCount, isLoading, isError, refetch } =
    useUserBadges();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Badge Wall</h2>
        <span className="text-xs text-text-hint">
          {earnedCount}/{totalCount}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorCard message="Unable to load badges" onRetry={refetch} compact />
      ) : earnedCount === 0 ? (
        <div className="py-2 text-center">
          <p className="mb-4 text-sm text-text-hint">
            Complete scenarios and build streaks to earn badges!
          </p>
          <div className="grid grid-cols-3 gap-4">
            {allBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={false}
                rarity={badge.rarity}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {allBadges.map((badge) => {
            const isEarned = earned.some((e) => e.id === badge.id);
            return (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={isEarned}
                rarity={badge.rarity}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
