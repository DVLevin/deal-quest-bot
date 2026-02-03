/**
 * Compact session card for the support session list.
 *
 * Extracts prospect info from output_json using parseOutputJson()
 * to show prospect type, seniority, and company context as preview.
 * Never accesses output_json fields directly.
 */

import { Card, Badge } from '@/shared/ui';
import { ChevronRight } from 'lucide-react';
import type { SupportSessionRow } from '@/types/tables';
import { parseOutputJson } from '../types';

interface SessionCardProps {
  session: SupportSessionRow;
  onClick: () => void;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const output = parseOutputJson(session.output_json);
  const { analysis } = output;

  const subtitle = analysis.company_context
    ? truncate(analysis.company_context, 60)
    : null;

  const preview = session.input_text
    ? truncate(session.input_text, 80)
    : null;

  return (
    <Card
      padding="sm"
      className="cursor-pointer transition-colors hover:bg-surface-secondary/30 active:scale-[0.99]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3">
        {/* Left: prospect info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="brand" size="sm">
              {analysis.prospect_type}
            </Badge>
            <Badge variant="info" size="sm">
              {analysis.seniority}
            </Badge>
          </div>

          {subtitle && (
            <p className="text-xs text-text-secondary">{subtitle}</p>
          )}

          {preview && (
            <p className="text-xs text-text-hint">{preview}</p>
          )}
        </div>

        {/* Right: date and chevron */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs text-text-hint">
            {formatDate(session.created_at)}
          </span>
          <ChevronRight className="h-4 w-4 text-text-hint" />
        </div>
      </div>
    </Card>
  );
}
