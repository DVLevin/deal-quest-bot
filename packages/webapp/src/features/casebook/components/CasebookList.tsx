/**
 * Browsable list of casebook entries with loading and empty states.
 *
 * Shows skeleton cards while loading, contextual empty messages
 * (different for "no results with filters" vs "no entries at all"),
 * and CasebookCard components for each entry.
 */

import { Skeleton } from '@/shared/ui';
import { CasebookCard } from './CasebookCard';
import type { CasebookRow } from '@/types/tables';

interface CasebookListProps {
  entries: CasebookRow[];
  isLoading: boolean;
  onEntryClick: (id: number) => void;
  hasActiveFilters?: boolean;
}

export function CasebookList({
  entries,
  isLoading,
  onEntryClick,
  hasActiveFilters = false,
}: CasebookListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton height={88} />
        <Skeleton height={88} />
        <Skeleton height={88} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-card bg-surface-secondary/30 p-6 text-center">
        <p className="text-sm font-medium text-text-secondary">
          No casebook entries found.
        </p>
        <p className="mt-1 text-xs text-text-hint">
          {hasActiveFilters
            ? 'Try adjusting your search or filters.'
            : 'Use /support in the bot to build your casebook. High-quality responses are saved automatically.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <CasebookCard
          key={entry.id}
          entry={entry}
          onClick={() => onEntryClick(entry.id)}
        />
      ))}
    </div>
  );
}
