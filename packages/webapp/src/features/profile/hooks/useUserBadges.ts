/**
 * Hook for the full badge collection (earned + locked).
 *
 * Fetches user + last 100 attempts and evaluates all badge definitions.
 * Uses the same query key as Dashboard's useRecentBadges (TanStack Query deduplicates).
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import {
  BADGE_DEFINITIONS,
  evaluateBadges,
  type BadgeDefinition,
  type EarnedBadge,
} from '@/shared/data/badges';
import type { UserRow, AttemptRow } from '@deal-quest/shared';

interface UserBadgesResult {
  allBadges: BadgeDefinition[];
  earned: EarnedBadge[];
  earnedCount: number;
  totalCount: number;
}

export function useUserBadges() {
  const telegramId = useAuthStore((s) => s.telegramId);

  const query = useQuery({
    queryKey: queryKeys.badges.byUser(telegramId!),
    queryFn: async (): Promise<UserBadgesResult> => {
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
        allBadges: BADGE_DEFINITIONS,
        earned,
        earnedCount: earned.length,
        totalCount: BADGE_DEFINITIONS.length,
      };
    },
    enabled: !!telegramId,
  });

  return {
    allBadges: query.data?.allBadges ?? BADGE_DEFINITIONS,
    earned: query.data?.earned ?? [],
    earnedCount: query.data?.earnedCount ?? 0,
    totalCount: query.data?.totalCount ?? BADGE_DEFINITIONS.length,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
