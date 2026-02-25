/**
 * Horizontal scrollable row of status pills for the lead pipeline stages.
 *
 * Shows all 6 statuses in pipeline order. The current status has a
 * filled/active state. Other statuses are tappable to update.
 * During mutation, all buttons are disabled with reduced opacity.
 * Minimum touch target: 44px height.
 */

import { cn } from '@/shared/lib/cn';
import { LEAD_STATUS_CONFIG, suggestNextStatus } from '../types';
import type { LeadStatus } from '@/types/enums';

interface LeadStatusSelectorProps {
  currentStatus: string;
  onStatusChange: (status: LeadStatus) => void;
  isUpdating: boolean;
}

const pipelineColors: Record<string, { bg: string; text: string; border: string }> = {
  analyzed:       { bg: 'bg-[oklch(0.70_0.15_250/0.12)]', text: 'text-[oklch(0.50_0.18_250)]', border: 'border-[oklch(0.70_0.15_250/0.3)]' },
  reached_out:    { bg: 'bg-[oklch(0.75_0.16_80/0.12)]',  text: 'text-[oklch(0.55_0.18_80)]',  border: 'border-[oklch(0.75_0.16_80/0.3)]' },
  meeting_booked: { bg: 'bg-[oklch(0.72_0.19_150/0.12)]', text: 'text-[oklch(0.50_0.20_150)]', border: 'border-[oklch(0.72_0.19_150/0.3)]' },
  in_progress:    { bg: 'bg-[oklch(0.60_0.20_300/0.12)]', text: 'text-[oklch(0.45_0.22_300)]', border: 'border-[oklch(0.60_0.20_300/0.3)]' },
  closed_won:     { bg: 'bg-[oklch(0.75_0.18_85/0.12)]',  text: 'text-[oklch(0.55_0.20_85)]',  border: 'border-[oklch(0.75_0.18_85/0.3)]' },
  closed_lost:    { bg: 'bg-[oklch(0.55_0.08_15/0.12)]',  text: 'text-[oklch(0.45_0.10_15)]',  border: 'border-[oklch(0.55_0.08_15/0.3)]' },
};

const orderedStatuses = (
  Object.entries(LEAD_STATUS_CONFIG) as [LeadStatus, (typeof LEAD_STATUS_CONFIG)[LeadStatus]][]
).sort((a, b) => a[1].order - b[1].order);

export function LeadStatusSelector({
  currentStatus,
  onStatusChange,
  isUpdating,
}: LeadStatusSelectorProps) {
  const suggestedNext = suggestNextStatus(currentStatus);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {orderedStatuses.map(([status, config]) => {
        const isActive = currentStatus === status;
        const colors = pipelineColors[status];
        return (
          <button
            key={status}
            type="button"
            disabled={isUpdating || isActive}
            onClick={() => onStatusChange(status)}
            className={cn(
              'min-h-[44px] shrink-0 rounded-xl px-4 text-xs font-medium transition-all',
              isActive
                ? cn(colors?.bg, colors?.text, 'border-2', colors?.border, 'stage-pulse')
                : status === suggestedNext
                  ? cn('border-2 border-dashed', colors?.border, colors?.bg, colors?.text)
                  : 'border border-surface-secondary bg-surface-secondary/30 text-text-secondary active:bg-surface-secondary/50',
              isUpdating && 'opacity-50',
            )}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
