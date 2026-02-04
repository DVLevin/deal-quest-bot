/**
 * Hook to identify categories/scenarios where the team scores lowest.
 *
 * Fetches recent attempts, groups by scenario_id, computes average score
 * per scenario, and returns the bottom 5 sorted ascending (worst first).
 *
 * Uses .limit() on queries and 5-minute staleTime for admin caching.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

export interface WeakArea {
  scenarioId: string;
  avgScore: number;
  attemptCount: number;
}

export function useWeakAreas() {
  return useQuery({
    queryKey: queryKeys.admin.weakAreas,
    queryFn: async (): Promise<WeakArea[]> => {
      const { data, error } = await getInsforge()
        .database.from('attempts')
        .select('scenario_id, score, mode')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const attempts = (data ?? []) as { scenario_id: string; score: number; mode: string }[];

      // Group by scenario_id
      const byScenario = new Map<string, number[]>();
      for (const a of attempts) {
        const existing = byScenario.get(a.scenario_id);
        if (existing) {
          existing.push(a.score);
        } else {
          byScenario.set(a.scenario_id, [a.score]);
        }
      }

      // Compute avg score per scenario, sort ascending (worst first)
      const areas: WeakArea[] = [];
      for (const [scenarioId, scores] of byScenario) {
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        areas.push({ scenarioId, avgScore, attemptCount: scores.length });
      }

      areas.sort((a, b) => a.avgScore - b.avgScore);

      return areas.slice(0, 5);
    },
    staleTime: 5 * 60_000,
  });
}
