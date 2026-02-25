/**
 * Enhanced streak display with flame icon, day count, and bonus XP indicator.
 *
 * When the user has an active streak (> 0 days), the flame icon is orange
 * and a bonus XP badge appears. Otherwise the flame is gray.
 */

import { Flame, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { MAX_STREAK_BONUS_XP } from '@deal-quest/shared';

interface StreakIndicatorProps {
  streakDays: number;
}

export function StreakIndicator({ streakDays }: StreakIndicatorProps) {
  const isActive = streakDays > 0;
  const bonusXP = Math.min(streakDays * 10, MAX_STREAK_BONUS_XP);

  return (
    <div className="flex items-center gap-1.5">
      <Flame
        className={cn(
          'h-4 w-4',
          isActive ? 'text-warning' : 'text-text-hint',
          streakDays >= 3 && 'streak-fire-shimmer',
        )}
      />
      <span
        className={cn(
          'text-sm',
          isActive ? 'text-text-secondary' : 'text-text-hint',
        )}
      >
        {isActive
          ? `${streakDays} day${streakDays !== 1 ? 's' : ''} streak`
          : 'No streak'}
      </span>
      {isActive && bonusXP > 0 && (
        <span className="ml-1 flex items-center gap-0.5 text-xs font-medium text-success">
          <Zap className="h-3 w-3" />
          +{bonusXP} XP bonus
        </span>
      )}
    </div>
  );
}
