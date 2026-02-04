/**
 * Compact card showing lead preview info for the list view.
 *
 * Displays prospect photo/avatar, name, company + title, relative date,
 * and a colored status badge matching the pipeline stage.
 */

import { User } from 'lucide-react';
import { Card, Badge } from '@/shared/ui';
import { LEAD_STATUS_CONFIG, formatLeadDate } from '../types';
import type { LeadListItem } from '../hooks/useLeads';
import type { LeadStatus } from '@/types/enums';

interface LeadCardProps {
  lead: LeadListItem;
  onClick: () => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const statusConfig = LEAD_STATUS_CONFIG[lead.status as LeadStatus];

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

      {/* Status badge */}
      {statusConfig && (
        <Badge variant={statusConfig.variant} size="sm" className="shrink-0">
          {statusConfig.label}
        </Badge>
      )}
    </Card>
  );
}
