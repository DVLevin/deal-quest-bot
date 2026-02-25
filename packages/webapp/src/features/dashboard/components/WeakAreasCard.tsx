/**
 * Dashboard card highlighting weak training areas.
 *
 * Identifies difficulties where the user's average score is below 50
 * and displays them with a "Practice" CTA linking to the Train page.
 *
 * Uses useTrainingStats for difficulty-level weak areas and
 * useTrackProgress for identifying the weakest Learn track level.
 *
 * Shows an encouraging "No weak spots!" message when no weak areas exist.
 * Returns null when data is still loading or no training data exists.
 *
 * TRAIN-V11-03: Weak area identification on Dashboard
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Card, Button } from '@/shared/ui';
import { DIFFICULTY_LABELS } from '@/types/constants';
import { useTrainingStats } from '@/features/train/hooks/useTrainingStats';
import { useTrackProgress } from '@/features/learn/hooks/useTrackProgress';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEAK_THRESHOLD = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeakArea {
  label: string;
  avgScore: number;
  type: 'difficulty' | 'track-level';
  difficulty?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeakAreasCard() {
  const navigate = useNavigate();
  const stats = useTrainingStats();
  const { data: levels } = useTrackProgress('foundations');

  const weakAreas = useMemo((): WeakArea[] => {
    const areas: WeakArea[] = [];

    // Difficulty-based weak areas from training stats
    for (const [diff, data] of Object.entries(stats.avgScoreByDifficulty)) {
      const diffNum = Number(diff);
      if (data.avg < WEAK_THRESHOLD && data.count >= 2) {
        areas.push({
          label: `${DIFFICULTY_LABELS[diffNum] ?? `Level ${diffNum}`} scenarios`,
          avgScore: data.avg,
          type: 'difficulty',
          difficulty: diffNum,
        });
      }
    }

    // Weakest completed Learn level (lowest bestScore among completed)
    if (levels) {
      const completedWithScores = levels.filter(
        (l) => l.status === 'completed' && l.bestScore > 0 && l.bestScore < WEAK_THRESHOLD,
      );
      if (completedWithScores.length > 0) {
        const weakest = completedWithScores.reduce((a, b) =>
          a.bestScore < b.bestScore ? a : b,
        );
        areas.push({
          label: `Learn: ${weakest.name}`,
          avgScore: weakest.bestScore,
          type: 'track-level',
        });
      }
    }

    // Sort by score ascending (weakest first)
    areas.sort((a, b) => a.avgScore - b.avgScore);

    return areas;
  }, [stats.avgScoreByDifficulty, levels]);

  // No data yet -- don't show anything
  const hasAnyData =
    Object.keys(stats.avgScoreByDifficulty).length > 0 ||
    (levels && levels.some((l) => l.status === 'completed'));

  if (stats.isLoading || !hasAnyData) return null;

  // No weak areas -- encouraging message
  if (weakAreas.length === 0) {
    return (
      <Card padding="sm">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-success" />
          <p className="text-sm font-medium text-text-secondary">
            No weak spots -- keep it up!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-overline mb-3">Weak Spots</p>

      <div className="space-y-2">
        {weakAreas.slice(0, 3).map((area) => (
          <div
            key={area.label}
            className="flex items-center gap-2 rounded-xl border border-warning/15 bg-warning/5 p-3"
          >
            <AlertTriangle size={14} className="shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text truncate">
                {area.label}
              </p>
              <p className="text-xs text-text-hint">
                Avg: {area.avgScore}/100
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() =>
                navigate(
                  area.type === 'track-level'
                    ? '/learn'
                    : area.difficulty != null
                      ? `/train?difficulty=${area.difficulty}`
                      : '/train',
                )
              }
            >
              Practice
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
