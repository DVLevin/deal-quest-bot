/**
 * Hook to evaluate earned badges client-side.
 *
 * Fetches user + recent attempts, then runs evaluateBadges() to determine
 * which badges the user has earned. No badges table needed.
 *
 * TanStack Query deduplicates the user query with useUserProgress.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import {
  BADGE_DEFINITIONS,
  evaluateBadges,
  type EarnedBadge,
} from '@/shared/data/badges';
import type { UserRow, AttemptRow } from '@deal-quest/shared';

interface RecentBadgesResult {
  earned: EarnedBadge[];
  total: number;
}

export function useRecentBadges() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.badges.byUser(telegramId!),
    queryFn: async (): Promise<RecentBadgesResult> => {
      const db = getInsforge().database;

      // Fetch user data
      const { data: userData, error: userError } = await db
        .from('users')
        .select(
          'id, telegram_id, username, first_name, total_xp, current_level, streak_days, last_active_at, created_at',
        )
        .eq('telegram_id', telegramId!)
        .single();

      if (userError) throw userError;

      // Fetch recent attempts (last 100)
      const { data: attemptsData, error: attemptsError } = await db
        .from('attempts')
        .select('id, user_id, telegram_id, scenario_id, mode, score, feedback_json, xp_earned, created_at')
        .eq('telegram_id', telegramId!)
        .order('created_at', { ascending: false })
        .limit(100);

      if (attemptsError) throw attemptsError;

      const earned = evaluateBadges(
        userData as UserRow,
        (attemptsData ?? []) as AttemptRow[],
      );

      return {
        earned,
        total: BADGE_DEFINITIONS.length,
      };
    },
    enabled: !!telegramId,
  });
}
