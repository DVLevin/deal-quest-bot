/**
 * Dashboard page -- the main landing page of the TMA.
 *
 * Displays user progress (XP, level, rank, streak), recent badges,
 * leaderboard, and quick-action navigation buttons.
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

export default function Dashboard() {
  const { levelUp, dismiss } = useLevelUpDetection();

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
        <ProgressCard />
        <TodayActionsCard />
        <QuickActions />
        <WeakAreasCard />
        <BadgePreview />
        <LeaderboardWidget />
      </div>
    </>
  );
}
