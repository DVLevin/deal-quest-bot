/**
 * Lead list component.
 *
 * Fetches leads via useLeads() hook and renders them as LeadCard components.
 * Shows loading skeletons, empty state, or lead cards.
 */

import { Users } from 'lucide-react';
import { Skeleton } from '@/shared/ui';
import { useLeads } from '../hooks/useLeads';
import { LeadCard } from './LeadCard';

interface LeadListProps {
  onSelectLead: (leadId: number) => void;
}

export function LeadList({ onSelectLead }: LeadListProps) {
  const { data: leads, isLoading } = useLeads();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card bg-surface-secondary/30 p-8 text-center">
        <Users className="h-8 w-8 text-text-hint" />
        <p className="text-sm font-medium text-text-secondary">
          No leads yet
        </p>
        <p className="text-xs text-text-hint">
          Analyze prospects in the bot to build your pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onClick={() => onSelectLead(lead.id)}
        />
      ))}
    </div>
  );
}
