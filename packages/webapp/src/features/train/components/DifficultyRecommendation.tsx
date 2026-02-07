/**
 * Arena-style recommended difficulty card with average score context.
 *
 * Displays when the user has enough training data. Shows the recommended
 * tier with a bold visual call-to-action.
 *
 * Returns null when recommendedDifficulty is null (insufficient data).
 */

import { TrendingUp } from 'lucide-react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { DIFFICULTY_LABELS } from '@/types/constants';

interface DifficultyRecommendationProps {
  recommendedDifficulty: number | null;
  avgScoreByDifficulty: Record<number, { avg: number; count: number }>;
  onSelectDifficulty: (difficulty: number) => void;
}

const TIER_COLORS: Record<number, { text: string; bg: string; accent: string }> = {
  1: { text: 'text-success', bg: 'bg-success/10', accent: 'oklch(0.72 0.19 150)' },
  2: { text: 'text-warning', bg: 'bg-warning/10', accent: 'oklch(0.80 0.18 85)' },
  3: { text: 'text-error', bg: 'bg-error/10', accent: 'oklch(0.65 0.22 25)' },
};

export function DifficultyRecommendation({
  recommendedDifficulty,
  avgScoreByDifficulty,
  onSelectDifficulty,
}: DifficultyRecommendationProps) {
  if (recommendedDifficulty === null) return null;

  const recommendedLabel = DIFFICULTY_LABELS[recommendedDifficulty] ?? `Level ${recommendedDifficulty}`;
  const tier = TIER_COLORS[recommendedDifficulty];

  const contextDifficulty = findContextDifficulty(recommendedDifficulty, avgScoreByDifficulty);
  const contextStats = contextDifficulty !== null ? avgScoreByDifficulty[contextDifficulty] : null;
  const contextLabel = contextDifficulty !== null
    ? (DIFFICULTY_LABELS[contextDifficulty] ?? `Level ${contextDifficulty}`)
    : null;

  return (
    <Card
      padding="sm"
      className={cn('flex items-center gap-3 border-l-4')}
      style={{ borderLeftColor: tier?.accent ?? 'var(--color-accent)' }}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          tier?.bg ?? 'bg-accent/15',
        )}
      >
        <TrendingUp size={18} className={tier?.text ?? 'text-accent'} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-bold', tier?.text ?? 'text-accent')}>
          Ready for {recommendedLabel}
        </p>
        {contextStats && contextLabel && (
          <p className="text-xs text-text-secondary">
            Averaging {contextStats.avg} on {contextLabel}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelectDifficulty(recommendedDifficulty)}
        className={cn(
          'shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-95',
        )}
        style={{ backgroundColor: tier?.accent ?? 'var(--color-accent)' }}
      >
        Try it
      </button>
    </Card>
  );
}

function findContextDifficulty(
  _recommended: number,
  avgByDifficulty: Record<number, { avg: number; count: number }>,
): number | null {
  for (const diff of [3, 2, 1] as const) {
    if (avgByDifficulty[diff]) {
      return diff;
    }
  }
  return null;
}
