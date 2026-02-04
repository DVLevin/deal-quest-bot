/**
 * Per-track completion stats summary card.
 *
 * Displays above the level list on the Learn page:
 * - Levels completed count (e.g., "2/4 completed")
 * - Average score across completed levels
 * - Best score across all levels
 *
 * Consumes LevelWithProgress[] from the parent (already fetched by useTrackProgress).
 * Pure presentational component -- no data fetching.
 *
 * TRAIN-V11-02: Track completion stats
 */

import { useMemo } from 'react';
import { Card } from '@/shared/ui';
import { CheckCircle, BarChart3, Trophy } from 'lucide-react';
import type { LevelWithProgress } from '../hooks/useTrackProgress';

interface TrackStatsProps {
  levels: LevelWithProgress[];
}

interface ComputedStats {
  completed: number;
  total: number;
  avgScore: number | null;
  bestScore: number | null;
}

function computeStats(levels: LevelWithProgress[]): ComputedStats {
  const total = levels.length;
  const completedLevels = levels.filter((l) => l.status === 'completed');
  const completed = completedLevels.length;

  // Average score: only from completed levels with a bestScore > 0
  const scoresForAvg = completedLevels
    .map((l) => l.bestScore)
    .filter((s) => s > 0);
  const avgScore =
    scoresForAvg.length > 0
      ? Math.round(scoresForAvg.reduce((sum, s) => sum + s, 0) / scoresForAvg.length)
      : null;

  // Best score: across all levels (including unlocked with attempts)
  const allScores = levels.map((l) => l.bestScore).filter((s) => s > 0);
  const bestScore = allScores.length > 0 ? Math.max(...allScores) : null;

  return { completed, total, avgScore, bestScore };
}

export function TrackStats({ levels }: TrackStatsProps) {
  const stats = useMemo(() => computeStats(levels), [levels]);

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        {/* Completed count */}
        <div className="flex items-center gap-1.5">
          <CheckCircle size={14} className="text-success" />
          <span className="text-xs font-medium text-text-secondary">
            {stats.completed}/{stats.total} completed
          </span>
        </div>

        {/* Average score */}
        <div className="flex items-center gap-1.5">
          <BarChart3 size={14} className="text-accent" />
          <span className="text-xs font-medium text-text-secondary">
            Avg: {stats.avgScore !== null ? stats.avgScore : '--'}
          </span>
        </div>

        {/* Best score */}
        <div className="flex items-center gap-1.5">
          <Trophy size={14} className="text-warning" />
          <span className="text-xs font-medium text-text-secondary">
            Best: {stats.bestScore !== null ? stats.bestScore : '--'}
          </span>
        </div>
      </div>
    </Card>
  );
}
