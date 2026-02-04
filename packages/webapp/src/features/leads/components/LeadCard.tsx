/**
 * Compact card showing lead preview info for the list view.
 *
 * Displays prospect photo/avatar, name, company + title, relative date,
 * and a colored status badge matching the pipeline stage.
 */

import { User } from 'lucide-react';
import { Card, Badge } from '@/shared/ui';
import { LEAD_STATUS_CONFIG, formatLeadDate, getLeadStaleDays, STALE_THRESHOLD_DAYS, LEAD_SOURCE_CONFIG } from '../types';
import type { LeadListItem } from '../hooks/useLeads';
import type { LeadStatus, LeadSource } from '@/types/enums';

interface LeadCardProps {
  lead: LeadListItem;
  onClick: () => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const statusConfig = LEAD_STATUS_CONFIG[lead.status as LeadStatus];
  const staleDays = getLeadStaleDays(lead.updated_at ?? null, lead.created_at ?? null);
  const isStale = staleDays >= STALE_THRESHOLD_DAYS;
  const sourceConfig = lead.lead_source
    ? LEAD_SOURCE_CONFIG[lead.lead_source as LeadSource]
    : null;

  return (
    <Card
      padding="sm"
      className="flex cursor-pointer items-center gap-3 transition-colors active:bg-surface-secondary/50"
      onClick={onClick}
    >
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

      {/* Stale + Source + Status badges */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isStale && (
          <Badge variant="warning" size="sm">
            {staleDays}d ago
          </Badge>
        )}
        {sourceConfig && (
          <Badge variant={sourceConfig.variant} size="sm">
            {sourceConfig.label}
          </Badge>
        )}
        {statusConfig && (
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        )}
      </div>
    </Card>
  );
}
