/**
 * Paginated attempt history list.
 *
 * Shows scenario ID, mode badge, score with color coding, and date.
 * Supports page navigation with Previous/Next buttons.
 */

import { useState } from 'react';
import { Card, Badge, Button, Skeleton, ErrorCard } from '@/shared/ui';
import { useAttemptHistory, PAGE_SIZE, type AttemptHistoryItem } from '../hooks/useAttemptHistory';
import { cn } from '@/shared/lib/cn';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-error';
}

function modeBadgeVariant(mode: string) {
  return mode === 'learn' ? 'info' as const : 'brand' as const;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function AttemptRow({ attempt }: { attempt: AttemptHistoryItem }) {
  // Truncate scenario_id to keep layout clean
  const scenarioLabel =
    attempt.scenario_id.length > 20
      ? `${attempt.scenario_id.slice(0, 18)}...`
      : attempt.scenario_id;

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Badge variant={modeBadgeVariant(attempt.mode)} size="sm">
          {attempt.mode}
        </Badge>
        <span className="truncate text-sm text-text-primary">{scenarioLabel}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-2">
        <span className={cn('text-sm font-semibold', scoreColor(attempt.score))}>
          {attempt.score}
        </span>
        <span className="text-xs text-text-hint w-14 text-right">
          {formatDate(attempt.created_at)}
        </span>
      </div>
    </div>
  );
}

export function AttemptHistory() {
  const [page, setPage] = useState(0);
  const { attempts, total, hasMore, isLoading, isError, refetch } = useAttemptHistory(page);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Recent Attempts</h2>
        {total > 0 && (
          <Badge size="sm">{total}</Badge>
        )}
      </div>

      {isLoading && page === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-5 w-12 rounded-badge" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorCard message="Unable to load attempt history" onRetry={refetch} compact />
      ) : attempts.length === 0 && page === 0 ? (
        <p className="py-4 text-center text-sm text-text-hint">
          No attempts yet -- start training to see your history!
        </p>
      ) : (
        <>
          <div className="divide-y divide-surface-secondary">
            {attempts.map((attempt) => (
              <AttemptRow key={attempt.id} attempt={attempt} />
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-text-hint">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
