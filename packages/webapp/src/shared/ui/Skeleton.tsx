import { type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-surface-secondary rounded-card', className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function SkeletonText({ className, lines = 3, ...props }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse bg-surface-secondary rounded-badge h-4',
            i === lines - 1 && 'w-3/4',
          )}
        />
      ))}
    </div>
  );
}
