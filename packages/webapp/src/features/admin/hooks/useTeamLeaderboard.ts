/**
 * Hook to fetch the full team leaderboard ranked by XP.
 *
 * Fetches all users sorted by total_xp descending, and all attempts
 * to compute per-user average scores. Returns an array of
 * { user, avgScore } objects already sorted by XP.
 *
 * Uses .limit() to cap data fetching and 5-minute staleTime.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { UserRow } from '@/types';

export interface LeaderboardEntry {
  user: Pick<UserRow, 'id' | 'telegram_id' | 'username' | 'first_name' | 'total_xp' | 'current_level'>;
  avgScore: number;
}

export function useTeamLeaderboard() {
  return useQuery({
    queryKey: queryKeys.admin.leaderboard,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const db = getInsforge().database;

      const [usersResult, attemptsResult] = await Promise.all([
        db
          .from('users')
          .select('id, telegram_id, username, first_name, total_xp, current_level')
          .order('total_xp', { ascending: false })
          .limit(50),
        db
          .from('attempts')
          .select('telegram_id, score')
          .limit(1000),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (attemptsResult.error) throw attemptsResult.error;

      const users = (usersResult.data ?? []) as Pick<UserRow, 'id' | 'telegram_id' | 'username' | 'first_name' | 'total_xp' | 'current_level'>[];
      const attempts = (attemptsResult.data ?? []) as { telegram_id: number; score: number }[];

      // Build a map of telegram_id -> scores array
      const scoresByUser = new Map<number, number[]>();
      for (const a of attempts) {
        const existing = scoresByUser.get(a.telegram_id);
        if (existing) {
          existing.push(a.score);
        } else {
          scoresByUser.set(a.telegram_id, [a.score]);
        }
      }

      return users.map((user) => {
        const scores = scoresByUser.get(user.telegram_id) ?? [];
        const avgScore =
          scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : 0;

        return { user, avgScore };
      });
    },
    staleTime: 5 * 60_000,
  });
}
