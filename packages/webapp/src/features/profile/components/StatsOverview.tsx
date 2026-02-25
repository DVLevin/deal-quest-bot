/**
 * Stats overview grid showing aggregate attempt statistics.
 *
 * Displays: Total Attempts, Average Score, Best Score, Scenarios Completed.
 * Uses useUserStats hook directly (no props).
 */

import { Target, BarChart3, Trophy, CheckCircle } from 'lucide-react';
import { Card, Skeleton, ErrorCard } from '@/shared/ui';
import { useUserStats } from '../hooks/useUserStats';
import { cn } from '@/shared/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface StatItemProps {
  icon: LucideIcon;
  value: string;
  label: string;
}

function StatItem({ icon: Icon, value, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <Icon className="h-5 w-5 text-text-secondary" />
      <span className="text-xl font-bold text-text-primary">{value}</span>
      <span className="text-xs text-text-hint text-center">{label}</span>
    </div>
  );
}

export function StatsOverview() {
  const { totalAttempts, averageScore, bestScore, scenariosCompleted, isLoading, isError, refetch } =
    useUserStats();

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Stats</h2>

      {isLoading ? (
        <div className={cn('grid grid-cols-2 gap-4', 'sm:grid-cols-4')}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorCard message="Unable to load stats" onRetry={refetch} compact />
      ) : (
        <div className={cn('grid grid-cols-2 gap-4', 'sm:grid-cols-4')}>
          <StatItem icon={Target} value={String(totalAttempts)} label="Total Attempts" />
          <StatItem
            icon={BarChart3}
            value={averageScore.toFixed(1)}
            label="Avg Score"
          />
          <StatItem icon={Trophy} value={String(bestScore)} label="Best Score" />
          <StatItem
            icon={CheckCircle}
            value={String(scenariosCompleted)}
            label="Scenarios"
          />
        </div>
      )}
    </Card>
  );
}
