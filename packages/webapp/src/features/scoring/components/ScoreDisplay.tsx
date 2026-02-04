/**
 * Animated circular score indicator with CSS @property counter.
 *
 * Renders an SVG circle whose progress arc fills from 0 to the score
 * percentage. The numeric value animates via CSS @property --score-value
 * (integer interpolation) defined in globals.css.
 *
 * Colors shift based on PASSING_SCORE threshold:
 * - >= PASSING_SCORE: success (green)
 * - < PASSING_SCORE: warning (orange)
 */

import { Badge } from '@/shared/ui';
import { PASSING_SCORE } from '@/types/constants';
import { XPGainAnimation } from '@/features/gamification/components/XPGainAnimation';

interface ScoreDisplayProps {
  score: number;
  xpEarned: number;
  /** Enable count-up and arc animations (default true) */
  animate?: boolean;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~264

export function ScoreDisplay({
  score,
  xpEarned,
  animate = true,
}: ScoreDisplayProps) {
  const passed = score >= PASSING_SCORE;
  const strokeColor = passed
    ? 'var(--color-success)'
    : 'var(--color-warning)';
  const dashArray = `${(score / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG circle */}
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--color-surface-secondary)"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            style={
              animate
                ? { animation: 'scoreArc 1.5s ease-out forwards' }
                : undefined
            }
          />
        </svg>

        {/* Center score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {animate ? (
            <span
              className="score-counter text-3xl font-bold text-text"
              style={{ ['--score-value' as string]: score }}
            />
          ) : (
            <span className="text-3xl font-bold text-text">{score}</span>
          )}
          <span className="text-xs text-text-hint">/100</span>
        </div>
      </div>

      {/* XP earned indicator */}
      {animate ? (
        <XPGainAnimation xpEarned={xpEarned} />
      ) : (
        <Badge variant={passed ? 'success' : 'warning'} size="md">
          +{xpEarned} XP
        </Badge>
      )}
    </div>
  );
}
