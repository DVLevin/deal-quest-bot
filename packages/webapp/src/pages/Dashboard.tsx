/**
 * Dashboard page -- the main landing page of the TMA.
 *
 * Displays user progress (XP, level, rank, streak), recent badges,
 * leaderboard, and quick-action navigation buttons.
 *
 * Smart landing: uses useSmartLanding to detect urgency and reorder
 * cards accordingly. Overdue actions promote TodayActionsCard to first
 * position; active streaks show encouragement header.
 *
 * All data fetching is handled inside the feature components via
 * their own TanStack Query hooks.
 */

import { ProgressCard } from '@/features/dashboard/components/ProgressCard';
import { BadgePreview } from '@/features/dashboard/components/BadgePreview';
import { LeaderboardWidget } from '@/features/dashboard/components/LeaderboardWidget';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { WeakAreasCard } from '@/features/dashboard/components/WeakAreasCard';
import { TodayActionsCard } from '@/features/dashboard/components/TodayActionsCard';
import { useLevelUpDetection } from '@/features/gamification/hooks/useLevelUpDetection';
import { LevelUpOverlay } from '@/features/gamification/components/LevelUpOverlay';
import { useSmartLanding } from '@/features/dashboard/hooks/useSmartLanding';
import { Skeleton } from '@/shared/ui';

export default function Dashboard() {
  const { levelUp, dismiss } = useLevelUpDetection();
  const { focus, isReady, overdueCount, streakDays } = useSmartLanding();

  const primaryAction =
    focus === 'actions-focus'
      ? '/leads'
      : focus === 'streak-focus'
        ? '/train'
        : '/support';

  return (
    <>
      {levelUp && (
        <LevelUpOverlay
          oldLevel={levelUp.oldLevel}
          newLevel={levelUp.newLevel}
          onDismiss={dismiss}
        />
      )}
      <div className="space-y-4 px-4 pt-4">
        {/* Contextual header based on smart landing focus */}
        {!isReady && <Skeleton className="h-6 w-48" />}
        {isReady && focus === 'actions-focus' && (
          <div className="rounded-2xl bg-gradient-to-b from-error/5 to-transparent px-4 pt-4 pb-2 mb-2">
            <p className="text-overline !text-error">
              You have {overdueCount} overdue action{overdueCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        {isReady && focus === 'streak-focus' && (
          <div className="rounded-2xl bg-gradient-to-b from-warning/5 to-transparent px-4 pt-4 pb-2 mb-2">
            <p className="text-overline !text-accent">
              Day {streakDays} streak — keep it going!
            </p>
          </div>
        )}

        {/* Card layout: actions-focus promotes TodayActionsCard first */}
        {focus === 'actions-focus' ? (
          <>
            <TodayActionsCard />
            <ProgressCard />
            <QuickActions primaryAction={primaryAction} />
            <WeakAreasCard />
            <BadgePreview />
            <LeaderboardWidget />
          </>
        ) : (
          <>
            <ProgressCard />
            <TodayActionsCard />
            <QuickActions primaryAction={primaryAction} />
            <WeakAreasCard />
            <BadgePreview />
            <LeaderboardWidget />
          </>
        )}
      </div>
    </>
  );
}
