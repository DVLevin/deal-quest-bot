/**
 * Individual level card with name, difficulty badge, status indicator, and best score.
 *
 * Renders differently based on level status:
 * - locked: reduced opacity, lock icon, not tappable
 * - unlocked: full opacity, play icon, tappable
 * - completed: success checkmark, best score display, tappable
 */

import { Lock, CheckCircle, Play } from 'lucide-react';
import { Card, Badge } from '@/shared/ui';
import { DIFFICULTY_LABELS } from '@deal-quest/shared';
import type { LevelWithProgress } from '../hooks/useTrackProgress';

interface LevelCardProps {
  level: LevelWithProgress;
  trackId: string;
  onClick: () => void;
}

function StatusIcon({ status }: { status: LevelWithProgress['status'] }) {
  switch (status) {
    case 'locked':
      return <Lock className="h-5 w-5 text-text-hint" />;
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'unlocked':
      return <Play className="h-5 w-5 text-accent" />;
  }
}

function difficultyVariant(difficulty: number) {
  if (difficulty === 1) return 'success' as const;
  if (difficulty === 2) return 'warning' as const;
  return 'error' as const;
}

export function LevelCard({ level, onClick }: LevelCardProps) {
  const isLocked = level.status === 'locked';
  const isCompleted = level.status === 'completed';

  return (
    <Card
      className={`transition-opacity ${isLocked ? 'opacity-50' : 'cursor-pointer active:scale-[0.98]'}`}
      onClick={isLocked ? undefined : onClick}
      role={isLocked ? undefined : 'button'}
      tabIndex={isLocked ? undefined : 0}
    >
      <div className="flex items-center gap-3 min-h-[44px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
          <StatusIcon status={level.status} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {level.name}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant={difficultyVariant(level.scenario.difficulty)}
              size="sm"
            >
              {DIFFICULTY_LABELS[level.scenario.difficulty] ?? 'Unknown'}
            </Badge>
            {isCompleted && level.bestScore > 0 && (
              <span className="text-xs text-success font-medium">
                Best: {level.bestScore}/100
              </span>
            )}
          </div>
        </div>

        {!isLocked && (
          <svg
            className="h-4 w-4 shrink-0 text-text-hint"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </Card>
  );
}
