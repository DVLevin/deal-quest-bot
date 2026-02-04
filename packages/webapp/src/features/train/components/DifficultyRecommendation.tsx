/**
 * Card showing recommended difficulty with average score context.
 *
 * Displays when the user has enough training data (>= MIN_ATTEMPTS at any
 * difficulty level). Shows the recommended difficulty label, the average
 * score that triggered the recommendation, and a "Try it" button.
 *
 * Returns null when recommendedDifficulty is null (insufficient data).
 */

import { TrendingUp } from 'lucide-react';
import { Card, Button } from '@/shared/ui';
import { DIFFICULTY_LABELS } from '@/types/constants';

interface DifficultyRecommendationProps {
  recommendedDifficulty: number | null;
  avgScoreByDifficulty: Record<number, { avg: number; count: number }>;
  onSelectDifficulty: (difficulty: number) => void;
}

export function DifficultyRecommendation({
  recommendedDifficulty,
  avgScoreByDifficulty,
  onSelectDifficulty,
}: DifficultyRecommendationProps) {
  if (recommendedDifficulty === null) return null;

  const recommendedLabel = DIFFICULTY_LABELS[recommendedDifficulty] ?? `Level ${recommendedDifficulty}`;

  // Find the difficulty that triggered this recommendation (context for subtitle)
  // If promoting (recommended > some diff), show the score at the difficulty below
  // If demoting (recommended < some diff), show the score at the difficulty above
  // If staying, show the score at the recommended difficulty
  const contextDifficulty = findContextDifficulty(recommendedDifficulty, avgScoreByDifficulty);
  const contextStats = contextDifficulty !== null ? avgScoreByDifficulty[contextDifficulty] : null;
  const contextLabel = contextDifficulty !== null
    ? (DIFFICULTY_LABELS[contextDifficulty] ?? `Level ${contextDifficulty}`)
    : null;

  return (
    <Card padding="sm" className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <TrendingUp size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">
          Recommended: {recommendedLabel}
        </p>
        {contextStats && contextLabel && (
          <p className="text-xs text-text-secondary">
            Averaging {contextStats.avg} on {contextLabel}
          </p>
        )}
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="shrink-0"
        onClick={() => onSelectDifficulty(recommendedDifficulty)}
      >
        Try it
      </Button>
    </Card>
  );
}

/**
 * Determine which difficulty to show as context for the recommendation.
 *
 * - If recommended is higher than the highest difficulty with data -> show that difficulty (promote)
 * - If recommended is lower than the highest difficulty with data -> show that difficulty (demote)
 * - If recommended equals the highest difficulty with data -> show that difficulty (stay)
 */
function findContextDifficulty(
  _recommended: number,
  avgByDifficulty: Record<number, { avg: number; count: number }>,
): number | null {
  // Find highest difficulty with data
  for (const diff of [3, 2, 1] as const) {
    if (avgByDifficulty[diff]) {
      return diff;
    }
  }
  return null;
}
