/**
 * Hook to compute training stats from attempts cross-referenced with scenario pool.
 *
 * Fetches the user's last 100 train-mode attempts and scenarios_seen,
 * cross-references with the scenario pool to resolve difficulty per attempt,
 * then computes:
 * - avgScoreByDifficulty: mean score per difficulty level (1, 2, 3)
 * - recommendedDifficulty: threshold-based promotion/demotion recommendation
 * - unseenCount: total pool minus seen scenarios
 * - totalPoolSize: combined scenario pool size
 * - isRunningLow: true when unseenCount <= 3
 *
 * The recommendation uses simple thresholds:
 * - avg >= 70 at current difficulty -> recommend harder (promote)
 * - avg < 40 at current difficulty -> recommend easier (demote)
 * - otherwise -> stay at current difficulty
 * - null when insufficient data (< MIN_ATTEMPTS at any difficulty)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import { TRAIN_POOL } from '../data/scenarios';
import { useScenarioPool } from './useScenarioPool';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_ATTEMPTS = 3;
const PROMOTE_THRESHOLD = 70;
const DEMOTE_THRESHOLD = 40;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrainingStats {
  avgScoreByDifficulty: Record<number, { avg: number; count: number }>;
  recommendedDifficulty: number | null;
  unseenCount: number;
  totalPoolSize: number;
  isRunningLow: boolean;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Helper: build scenario_id -> difficulty map
// ---------------------------------------------------------------------------

interface MinimalDbScenario {
  scenario_id: string;
  difficulty: number;
}

function buildDifficultyMap(
  dbScenarios: MinimalDbScenario[],
): Map<string, number> {
  const map = new Map<string, number>();

  // Static pool first
  for (const s of TRAIN_POOL) {
    map.set(s.id, s.difficulty);
  }

  // DB-generated scenarios (different IDs, so unlikely to overlap)
  for (const s of dbScenarios) {
    map.set(s.scenario_id, s.difficulty);
  }

  return map;
}

// ---------------------------------------------------------------------------
// Helper: compute average score per difficulty
// ---------------------------------------------------------------------------

function computeAvgByDifficulty(
  attempts: Array<{ scenario_id: string; score: number }>,
  difficultyMap: Map<string, number>,
): Record<number, { avg: number; count: number }> {
  const groups: Record<number, number[]> = { 1: [], 2: [], 3: [] };

  for (const a of attempts) {
    const diff = difficultyMap.get(a.scenario_id);
    if (diff !== undefined && groups[diff]) {
      groups[diff].push(a.score);
    }
  }

  const result: Record<number, { avg: number; count: number }> = {};
  for (const [diff, scores] of Object.entries(groups)) {
    const d = Number(diff);
    if (scores.length > 0) {
      result[d] = {
        avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
        count: scores.length,
      };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helper: recommend difficulty
// ---------------------------------------------------------------------------

function recommendDifficulty(
  avgByDifficulty: Record<number, { avg: number; count: number }>,
): number | null {
  // Check from hardest to easiest -- find the highest difficulty with enough data
  for (const diff of [3, 2, 1] as const) {
    const stats = avgByDifficulty[diff];
    if (stats && stats.count >= MIN_ATTEMPTS) {
      if (diff < 3 && stats.avg >= PROMOTE_THRESHOLD) {
        return diff + 1; // Promote
      }
      if (diff > 1 && stats.avg < DEMOTE_THRESHOLD) {
        return diff - 1; // Demote
      }
      return diff; // Stay
    }
  }

  // Not enough data at any difficulty
  return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTrainingStats(): TrainingStats {
  const telegramId = useAuthStore((s) => s.telegramId);

  // Fetch full pool (no difficulty filter) to get DB-generated scenarios for the difficulty map
  const { data: fullPool } = useScenarioPool(undefined);

  // Fetch user's last 100 train-mode attempts
  const attemptsQuery = useQuery({
    queryKey: queryKeys.training.stats(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('attempts')
        .select('scenario_id, score, mode')
        .eq('telegram_id', telegramId!)
        .eq('mode', 'train')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data ?? []) as Array<{
        scenario_id: string;
        score: number;
        mode: string;
      }>;
    },
    enabled: !!telegramId,
    refetchOnWindowFocus: true,
  });

  // Fetch scenarios_seen for unseen count
  const seenQuery = useQuery({
    queryKey: queryKeys.scenarios.seen(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('scenarios_seen')
        .select('scenario_id')
        .eq('telegram_id', telegramId!);

      if (error) throw error;

      return (data ?? []) as Array<{ scenario_id: string }>;
    },
    enabled: !!telegramId,
    refetchOnWindowFocus: true,
  });

  // Derive all stats from fetched data
  const stats = useMemo((): Omit<TrainingStats, 'isLoading'> => {
    const attempts = attemptsQuery.data ?? [];
    const seenRows = seenQuery.data ?? [];

    // Build difficulty map from both static pool AND DB-generated scenarios
    // The fullPool from useScenarioPool already combines both sources into TrainScenario[]
    const dbScenarios: MinimalDbScenario[] = (fullPool ?? []).map((s) => ({
      scenario_id: s.id,
      difficulty: s.difficulty,
    }));
    const difficultyMap = buildDifficultyMap(dbScenarios);

    // Avg score per difficulty
    const avgScoreByDifficulty = computeAvgByDifficulty(attempts, difficultyMap);

    // Recommended difficulty
    const recommended = recommendDifficulty(avgScoreByDifficulty);

    // Unseen count: total pool size minus seen
    const totalPoolSize = difficultyMap.size;
    const seenIds = new Set(seenRows.map((r) => r.scenario_id));
    const unseenCount = Math.max(0, totalPoolSize - seenIds.size);
    const isRunningLow = unseenCount <= 3 && totalPoolSize > 0;

    return {
      avgScoreByDifficulty,
      recommendedDifficulty: recommended,
      unseenCount,
      totalPoolSize,
      isRunningLow,
    };
  }, [attemptsQuery.data, seenQuery.data, fullPool]);

  return {
    ...stats,
    isLoading: attemptsQuery.isLoading || seenQuery.isLoading,
  };
}
