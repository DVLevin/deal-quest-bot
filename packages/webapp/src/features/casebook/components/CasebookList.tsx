/**
 * Browsable list of casebook entries with loading and empty states.
 *
 * Shows skeleton cards while loading, contextual empty messages
 * (different for "no results with filters" vs "no entries at all"),
 * and CasebookCard components for each entry.
 */

import { useCallback } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { Skeleton, Button, ErrorCard } from '@/shared/ui';
import { CasebookCard } from './CasebookCard';
import type { CasebookRow } from '@/types/tables';

interface CasebookListProps {
  entries: CasebookRow[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEntryClick: (id: number) => void;
  hasActiveFilters?: boolean;
}

function CasebookEmptyState() {
  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

  const handleGoToBot = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=support`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-gradient-to-b from-brand-50 to-surface-secondary/20 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
        <BookOpen className="h-7 w-7 text-brand-700" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-text">
          Your Team Playbook
        </h3>
        <p className="text-sm text-text-secondary">
          Think of this as your squad's cheat sheet
        </p>
      </div>

      <div className="w-full space-y-2 text-left">
        <div className="flex items-start gap-2 rounded-lg bg-white/60 p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs text-text-secondary">
            Every time you analyze a deal with <strong>/support</strong>, your best
            strategies get auto-saved here. The more you use it, the smarter
            your playbook gets!
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-white/60 p-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs text-text-secondary">
            Your teammates' winning strategies appear here too — learn
            from each other's best moves and level up together.
          </p>
        </div>
      </div>

      <Button
        variant="primary"
        size="md"
        className="w-full gap-2"
        onClick={handleGoToBot}
      >
        Analyze Your First Deal
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CasebookList({
  entries,
  isLoading,
  isError = false,
  onRetry,
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

  if (isError) {
    return <ErrorCard message="Unable to load casebook" onRetry={onRetry} />;
  }

  if (entries.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-card bg-surface-secondary/30 p-6 text-center">
          <p className="text-sm font-medium text-text-secondary">
            No entries match your filters.
          </p>
          <p className="mt-1 text-xs text-text-hint">
            Try adjusting your search or removing some filters.
          </p>
        </div>
      );
    }

    return <CasebookEmptyState />;
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
