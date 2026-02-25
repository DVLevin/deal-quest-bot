/**
 * Compact card for a casebook entry in the list view.
 *
 * Shows persona type badge, scenario type badge, quality score indicator,
 * optional industry tag, and truncated draft response preview.
 */

import { Card, Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { CasebookRow } from '@/types/tables';

interface CasebookCardProps {
  entry: CasebookRow;
  onClick: () => void;
}

function QualityScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const colorClass =
    score >= 0.8
      ? 'text-success'
      : score >= 0.6
        ? 'text-warning'
        : 'text-error';

  return (
    <span className={cn('text-xs font-bold tabular-nums', colorClass)}>
      {pct}%
    </span>
  );
}

export function CasebookCard({ entry, onClick }: CasebookCardProps) {
  const preview = entry.draft_response
    ? entry.draft_response.length > 100
      ? entry.draft_response.slice(0, 100) + '...'
      : entry.draft_response
    : 'No draft available';

  return (
    <Card
      as="button"
      padding="sm"
      className="w-full text-left transition-colors hover:bg-surface/80 active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Top row: badges + score */}
      <div className="flex items-center gap-2">
        <Badge variant="brand" size="sm">
          {entry.persona_type}
        </Badge>
        <Badge variant="default" size="sm">
          {entry.scenario_type}
        </Badge>
        {entry.industry && (
          <Badge variant="info" size="sm">
            {entry.industry}
          </Badge>
        )}
        <span className="ml-auto">
          <QualityScore score={entry.quality_score} />
        </span>
      </div>

      {/* Preview text */}
      <p className="mt-2 text-sm leading-relaxed text-text-secondary line-clamp-2">
        {preview}
      </p>
    </Card>
  );
}
