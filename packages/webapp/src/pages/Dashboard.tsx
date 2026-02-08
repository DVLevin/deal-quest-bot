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

import { Link } from 'react-router';
import { ProgressCard } from '@/features/dashboard/components/ProgressCard';
import { BadgePreview } from '@/features/dashboard/components/BadgePreview';
import { LeaderboardWidget } from '@/features/dashboard/components/LeaderboardWidget';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { WeakAreasCard } from '@/features/dashboard/components/WeakAreasCard';
import { TodayActionsCard } from '@/features/dashboard/components/TodayActionsCard';
import { FirstTimeGuide } from '@/features/dashboard/components/FirstTimeGuide';
import { useLevelUpDetection } from '@/features/gamification/hooks/useLevelUpDetection';
import { LevelUpOverlay } from '@/features/gamification/components/LevelUpOverlay';
import { useSmartLanding } from '@/features/dashboard/hooks/useSmartLanding';
import { useUserProgress } from '@/features/dashboard/hooks/useUserProgress';
import { useLeads } from '@/features/leads/hooks/useLeads';
import { isAdminUsername } from '@/features/admin/lib/adminAccess';
import { Skeleton } from '@/shared/ui';

export default function Dashboard() {
  const { levelUp, dismiss } = useLevelUpDetection();
  const { focus, isReady, overdueCount, streakDays } = useSmartLanding();
  const { data: user } = useUserProgress();
  const { data: leads } = useLeads();
  const showAdmin = isAdminUsername(user?.username);
  const isFirstTimeUser = user && user.total_xp === 0 && (!leads || leads.length === 0);

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
      <div className="space-y-4 px-4 pt-4 pb-24">
        {/* Contextual alert banner */}
        {!isReady && <Skeleton className="h-6 w-48" />}
        {isReady && focus === 'actions-focus' && (
          <div className="rounded-2xl border border-error/20 bg-gradient-to-br from-error/8 via-error/4 to-transparent px-4 py-3">
            <p className="text-overline !text-error">
              {overdueCount} overdue action{overdueCount !== 1 ? 's' : ''} — tap below
            </p>
          </div>
        )}
        {isReady && focus === 'streak-focus' && (
          <div className="rounded-2xl border border-warning/20 bg-gradient-to-br from-warning/8 via-warning/4 to-transparent px-4 py-3">
            <p className="text-overline !text-warning">
              Day {streakDays} streak — keep the momentum
            </p>
          </div>
        )}

        {isFirstTimeUser && <FirstTimeGuide />}

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

        {showAdmin && (
          <Link
            to="/admin"
            className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-muted/20 bg-surface/60 px-4 py-3 text-sm text-muted transition-colors active:bg-surface"
          >
            <span className="text-xs opacity-60">&#9881;</span>
            Admin Panel
          </Link>
        )}
      </div>
    </>
  );
}
