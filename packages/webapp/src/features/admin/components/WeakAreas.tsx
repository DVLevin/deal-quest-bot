/**
 * Weak areas display showing scenarios where the team scores lowest (ADMIN-04).
 *
 * Lists the bottom 5 scenarios by average score, with color-coded scores
 * (red < 40, warning < 60, success >= 60) and attempt counts.
 */

import { Card, Skeleton, ErrorCard } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useWeakAreas } from '@/features/admin/hooks/useWeakAreas';

/** Format a scenario_id into a human-readable label. */
function formatScenarioId(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Get color class based on score threshold. */
function getScoreColor(score: number): string {
  if (score < 40) return 'text-error';
  if (score < 60) return 'text-warning';
  return 'text-success';
}

export function WeakAreas() {
  const { data: areas, isLoading, isError, refetch } = useWeakAreas();

  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Areas to Improve</h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={32} />
          ))}
        </div>
      </Card>
    );
  }

  if (isError || !areas) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Areas to Improve</h3>
        <ErrorCard message="Unable to load weak areas" onRetry={refetch} compact />
      </Card>
    );
  }

  if (areas.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Areas to Improve</h3>
        <p className="text-sm text-text-hint">No weak areas identified</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text">Areas to Improve</h3>
      <div className="space-y-2">
        {areas.map((area) => (
          <div
            key={area.scenarioId}
            className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2"
          >
            {/* Scenario name */}
            <span className="flex-1 truncate text-sm text-text">
              {formatScenarioId(area.scenarioId)}
            </span>

            {/* Attempt count */}
            <span className="text-xs text-text-hint">
              {area.attemptCount} {area.attemptCount === 1 ? 'attempt' : 'attempts'}
            </span>

            {/* Average score */}
            <span className={cn('text-sm font-semibold', getScoreColor(area.avgScore))}>
              {Math.round(area.avgScore)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
