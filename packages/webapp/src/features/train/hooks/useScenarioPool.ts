/**
 * Hook combining DB generated_scenarios with static fallback pool.
 *
 * Queries the InsForge generated_scenarios table filtered by difficulty.
 * Falls back to the static TRAIN_POOL when the DB returns 0 rows or errors.
 *
 * For Random (difficulty = undefined), returns all scenarios and lets the
 * caller pick one randomly.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import { TRAIN_POOL, type TrainScenario } from '../data/scenarios';
import type { GeneratedScenarioRow } from '@/types/tables';

/**
 * Map a GeneratedScenarioRow from InsForge to the local TrainScenario interface.
 */
function mapRowToScenario(row: GeneratedScenarioRow): TrainScenario {
  return {
    id: row.scenario_id,
    category: row.category,
    difficulty: row.difficulty as 1 | 2 | 3,
    persona: {
      name: row.persona.name,
      role: row.persona.role,
      company: row.persona.company ?? '',
      background: row.persona.personality ?? '',
    },
    situation: row.situation,
    scoringFocus: row.scoring_focus,
    idealResponse: row.ideal_response,
  };
}

export function useScenarioPool(difficulty?: number) {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.scenarios.pool(difficulty),
    queryFn: async (): Promise<TrainScenario[]> => {
      try {
        let query = getInsforge()
          .database.from('generated_scenarios')
          .select('*');

        if (difficulty !== undefined) {
          query = query.eq('difficulty', difficulty);
        }

        const { data, error } = await query.order('created_at', {
          ascending: false,
        });

        if (error) throw error;

        const rows = (data ?? []) as GeneratedScenarioRow[];

        // Fall back to static pool if DB has no generated scenarios
        if (rows.length === 0) {
          return filterStaticPool(difficulty);
        }

        return rows.map(mapRowToScenario);
      } catch {
        // On any error (network, auth, etc.), fall back to static pool
        return filterStaticPool(difficulty);
      }
    },
    enabled: !!telegramId,
  });
}

/**
 * Filter the static TRAIN_POOL by difficulty.
 * Returns all scenarios when difficulty is undefined (Random mode).
 */
function filterStaticPool(difficulty?: number): TrainScenario[] {
  if (difficulty === undefined) return TRAIN_POOL;
  return TRAIN_POOL.filter((s) => s.difficulty === difficulty);
}
