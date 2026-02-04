/**
 * Hook to fetch recent team activity with user display names.
 *
 * Fetches the last 20 attempts and all users in parallel, then joins
 * to attach user display names to each activity item.
 *
 * Uses .limit() on all queries and 5-minute staleTime for admin caching.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

export interface ActivityItem {
  id: number;
  userName: string;
  scenarioId: string;
  score: number;
  mode: string;
  xpEarned: number;
  createdAt: string;
}

export function useRecentActivity() {
  return useQuery({
    queryKey: queryKeys.admin.recentActivity,
    queryFn: async (): Promise<ActivityItem[]> => {
      const db = getInsforge().database;

      const [attemptsResult, usersResult] = await Promise.all([
        db
          .from('attempts')
          .select('id, telegram_id, scenario_id, score, mode, xp_earned, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        db
          .from('users')
          .select('telegram_id, username, first_name')
          .limit(50),
      ]);

      if (attemptsResult.error) throw attemptsResult.error;
      if (usersResult.error) throw usersResult.error;

      const attempts = (attemptsResult.data ?? []) as {
        id: number;
        telegram_id: number;
        scenario_id: string;
        score: number;
        mode: string;
        xp_earned: number;
        created_at: string | null;
      }[];

      const users = (usersResult.data ?? []) as {
        telegram_id: number;
        username: string | null;
        first_name: string | null;
      }[];

      // Build user lookup map
      const userMap = new Map<number, string>();
      for (const u of users) {
        userMap.set(u.telegram_id, u.first_name || u.username || `User ${u.telegram_id}`);
      }

      return attempts.map((a) => ({
        id: a.id,
        userName: userMap.get(a.telegram_id) ?? `User ${a.telegram_id}`,
        scenarioId: a.scenario_id,
        score: a.score,
        mode: a.mode,
        xpEarned: a.xp_earned,
        createdAt: a.created_at ?? new Date().toISOString(),
      }));
    },
    staleTime: 5 * 60_000,
  });
}
