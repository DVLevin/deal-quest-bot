/**
 * Hook to compute aggregate stats from the user's attempts.
 *
 * Fetches the last 100 attempts and computes:
 * - totalAttempts: number of attempts
 * - averageScore: mean score (rounded to 1 decimal)
 * - bestScore: highest score
 * - scenariosCompleted: count of unique scenario_ids
 *
 * Handles zero attempts gracefully (returns 0, not NaN).
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';

interface UserStats {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  scenariosCompleted: number;
}

export function useUserStats() {
  const telegramId = useAuthStore((s) => s.telegramId);

  const query = useQuery({
    queryKey: queryKeys.attempts.stats(telegramId!),
    queryFn: async (): Promise<UserStats> => {
      const { data, error } = await getInsforge()
        .database.from('attempts')
        .select('id, scenario_id, score, xp_earned, mode, created_at')
        .eq('telegram_id', telegramId!)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const attempts = data as Array<{
        id: number;
        scenario_id: string;
        score: number;
        xp_earned: number;
        mode: string;
        created_at: string | null;
      }>;

      if (!attempts || attempts.length === 0) {
        return {
          totalAttempts: 0,
          averageScore: 0,
          bestScore: 0,
          scenariosCompleted: 0,
        };
      }

      const totalAttempts = attempts.length;
      const scores = attempts.map((a) => a.score);
      const averageScore =
        Math.round((scores.reduce((sum, s) => sum + s, 0) / totalAttempts) * 10) / 10;
      const bestScore = Math.max(...scores);
      const uniqueScenarios = new Set(attempts.map((a) => a.scenario_id));
      const scenariosCompleted = uniqueScenarios.size;

      return { totalAttempts, averageScore, bestScore, scenariosCompleted };
    },
    enabled: !!telegramId,
  });

  return {
    totalAttempts: query.data?.totalAttempts ?? 0,
    averageScore: query.data?.averageScore ?? 0,
    bestScore: query.data?.bestScore ?? 0,
    scenariosCompleted: query.data?.scenariosCompleted ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
