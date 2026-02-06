/**
 * Smart landing hook that determines dashboard focus mode.
 *
 * Composes useTodayActions and useUserProgress to decide which content
 * should be promoted to the top of the Dashboard. Overdue actions take
 * highest priority, followed by active streaks.
 *
 * TMAUX-V20-17-01: Smart Landing
 */

import { useTodayActions } from '@/features/leads/hooks/useTodayActions';
import { useUserProgress } from './useUserProgress';

export type LandingFocus = 'actions-focus' | 'streak-focus' | 'default';

interface SmartLandingResult {
  focus: LandingFocus;
  isReady: boolean;
  overdueCount: number;
  streakDays: number;
}

export function useSmartLanding(): SmartLandingResult {
  const { data: actions, isLoading: actionsLoading } = useTodayActions();
  const { data: user, isLoading: userLoading } = useUserProgress();

  if (actionsLoading || userLoading) {
    return { focus: 'default', isReady: false, overdueCount: 0, streakDays: 0 };
  }

  const overdueCount = actions?.filter((a) => a.isOverdue).length ?? 0;
  const streakDays = user?.streak_days ?? 0;

  let focus: LandingFocus = 'default';
  if (overdueCount > 0) {
    focus = 'actions-focus';
  } else if (streakDays > 0) {
    focus = 'streak-focus';
  }

  return { focus, isReady: true, overdueCount, streakDays };
}
