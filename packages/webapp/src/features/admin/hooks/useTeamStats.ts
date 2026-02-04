/**
 * Hook to fetch aggregate team statistics for the admin dashboard.
 *
 * Queries all users and recent attempts in parallel, then computes:
 * - Total users count
 * - Total XP across all users
 * - Active users (last_active_at within 7 days)
 * - Recent attempts array (for downstream use by PerformanceChart)
 *
 * Uses .limit() on all queries to prevent unbounded data fetching.
 * 5-minute staleTime since admin data does not need real-time updates.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { UserRow, AttemptRow } from '@/types';

interface TeamStats {
  totalUsers: number;
  totalXP: number;
  activeUsers: number;
  recentAttempts: AttemptRow[];
}

export function useTeamStats() {
  return useQuery({
    queryKey: queryKeys.admin.teamStats,
    queryFn: async (): Promise<TeamStats> => {
      const db = getInsforge().database;

      const [usersResult, attemptsResult] = await Promise.all([
        db
          .from('users')
          .select('id, telegram_id, username, first_name, total_xp, current_level, streak_days, last_active_at')
          .limit(50),
        db
          .from('attempts')
          .select('id, telegram_id, score, mode, scenario_id, xp_earned, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (attemptsResult.error) throw attemptsResult.error;

      const users = (usersResult.data ?? []) as UserRow[];
      const attempts = (attemptsResult.data ?? []) as AttemptRow[];

      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      const totalXP = users.reduce((sum, u) => sum + (u.total_xp ?? 0), 0);
      const activeUsers = users.filter((u) => {
        if (!u.last_active_at) return false;
        return now - new Date(u.last_active_at).getTime() < sevenDaysMs;
      }).length;

      return {
        totalUsers: users.length,
        totalXP,
        activeUsers,
        recentAttempts: attempts,
      };
    },
    staleTime: 5 * 60_000,
  });
}
