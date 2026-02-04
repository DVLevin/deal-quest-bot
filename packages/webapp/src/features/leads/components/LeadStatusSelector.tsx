/**
 * Horizontal scrollable row of status pills for the lead pipeline stages.
 *
 * Shows all 6 statuses in pipeline order. The current status has a
 * filled/active state. Other statuses are tappable to update.
 * During mutation, all buttons are disabled with reduced opacity.
 * Minimum touch target: 44px height.
 */

import { cn } from '@/shared/lib/cn';
import { LEAD_STATUS_CONFIG } from '../types';
import type { LeadStatus } from '@/types/enums';

interface LeadStatusSelectorProps {
  currentStatus: string;
  onStatusChange: (status: LeadStatus) => void;
  isUpdating: boolean;
}

const orderedStatuses = (
  Object.entries(LEAD_STATUS_CONFIG) as [LeadStatus, (typeof LEAD_STATUS_CONFIG)[LeadStatus]][]
).sort((a, b) => a[1].order - b[1].order);

export function LeadStatusSelector({
  currentStatus,
  onStatusChange,
  isUpdating,
}: LeadStatusSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {orderedStatuses.map(([status, config]) => {
        const isActive = currentStatus === status;
        return (
          <button
            key={status}
            type="button"
            disabled={isUpdating || isActive}
            onClick={() => onStatusChange(status)}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full px-4 text-xs font-medium transition-all',
              isActive
                ? 'bg-accent text-white shadow-sm'
                : 'bg-surface-secondary text-text-secondary active:bg-surface-secondary/70',
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
