import { cn } from '@/shared/lib/cn';

export interface ProgressBarProps {
  /** Current value (e.g., XP earned in current level) */
  current: number;
  /** Maximum value (e.g., XP needed for next level) */
  max: number;
  className?: string;
  /** Show "current / max XP" label below the bar (default true) */
  showLabel?: boolean;
  /** Bar height variant (default 'md') */
  size?: 'sm' | 'md' | 'lg';
}

const heights = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
} as const;

export function ProgressBar({
  current,
  max,
  className,
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.max((current / max) * 100, 0), 100) : 0;

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full rounded-full bg-surface-secondary overflow-hidden',
          heights[size],
        )}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-text-hint">
          {current.toLocaleString()} / {max.toLocaleString()} XP
        </p>
      )}
    </div>
  );
}
