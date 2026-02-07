/**
 * Compact card showing lead preview info for the list view.
 *
 * Displays prospect photo/avatar, name, company + title, relative date,
 * a colored status badge, and engagement plan progress (bar, overdue badge,
 * next action preview).
 */

import { User, AlertCircle, Camera } from 'lucide-react';
import { Card, Badge, ProgressBar } from '@/shared/ui';
import { LEAD_STATUS_CONFIG, PIPELINE_ACCENT, formatLeadDate } from '../types';
import type { PlanProgress } from '../types';
import type { LeadListItem } from '../hooks/useLeads';
import type { LeadStatus } from '@/types/enums';

interface LeadCardProps {
  lead: LeadListItem;
  progress?: PlanProgress;
  onClick: () => void;
}

export function LeadCard({ lead, progress, onClick }: LeadCardProps) {
  const statusConfig = LEAD_STATUS_CONFIG[lead.status as LeadStatus];

  return (
    <Card
      padding="none"
      className="cursor-pointer overflow-hidden transition-colors active:bg-surface-secondary/50"
      onClick={onClick}
    >
      <div className="flex">
        {/* Left color bar */}
        <div
          className="w-1 shrink-0 rounded-l-card"
          style={{ backgroundColor: PIPELINE_ACCENT[lead.status as LeadStatus] ?? 'transparent' }}
        />
        <div className="flex-1 space-y-2 p-3">
          {/* Top row: avatar + info + status badge */}
          <div className="flex items-center gap-3">
            {/* Photo or avatar placeholder */}
            <div className="shrink-0">
              {lead.photo_url ? (
                <img
                  src={lead.photo_url}
                  alt={lead.prospect_name ?? 'Prospect'}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <User className="h-5 w-5 text-accent" />
                </div>
              )}
            </div>

            {/* Lead info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">
                {lead.prospect_first_name && lead.prospect_last_name
                  ? `${lead.prospect_first_name} ${lead.prospect_last_name}`
                  : lead.prospect_name ?? 'Unknown Prospect'}
              </p>
              {(lead.prospect_company || lead.prospect_title) && (
                <p className="truncate text-xs text-text-secondary">
                  {[lead.prospect_title, lead.prospect_company]
                    .filter(Boolean)
                    .join(' @ ')}
                </p>
              )}
              <p className="text-xs text-text-hint">
                {formatLeadDate(lead.updated_at ?? lead.created_at ?? null)}
              </p>
            </div>

            {/* Status badge */}
            {statusConfig && (
              <Badge variant={statusConfig.variant} size="sm" className="shrink-0">
                {statusConfig.label}
              </Badge>
            )}
          </div>

          {/* Engagement plan progress */}
          {progress && progress.total > 0 && (
            <div className="pl-13">
              <ProgressBar
                current={progress.completed}
                max={progress.total}
                size="sm"
                showLabel={false}
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-text-hint">
                    {progress.completed}/{progress.total} steps
                  </span>
                  {progress.proofCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <Camera className="h-3 w-3" />
                      {progress.proofCount} screenshot{progress.proofCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {progress.overdue > 0 && (
                  <Badge variant="error" size="sm">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {progress.overdue} overdue
                  </Badge>
                )}
              </div>
              {progress.nextAction && (
                <p className="mt-1 truncate text-xs text-text-secondary">
                  Next: {progress.nextAction}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
