/**
 * Arena-style indicator showing remaining unseen scenarios.
 *
 * Displays as a progress-bar style "missions available" meter.
 * When isRunningLow, shows a warning nudge.
 *
 * Returns null when totalPoolSize is 0.
 */

import { cn } from '@/shared/lib/cn';

interface ScenarioVarietyProps {
  unseenCount: number;
  totalPoolSize: number;
  isRunningLow: boolean;
}

export function ScenarioVariety({
  unseenCount,
  totalPoolSize,
  isRunningLow,
}: ScenarioVarietyProps) {
  if (totalPoolSize === 0) return null;

  const pct = Math.round((unseenCount / totalPoolSize) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-overline">Scenarios Available</span>
        <span className={cn(
          'text-xs font-bold tabular-nums',
          isRunningLow ? 'text-warning' : 'text-text-secondary',
        )}>
          {unseenCount}/{totalPoolSize}
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isRunningLow ? 'bg-warning' : 'bg-accent',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isRunningLow && (
        <p className="text-xs text-warning">
          Only {unseenCount} left — consider revisiting past scenarios.
        </p>
      )}
    </div>
  );
}
