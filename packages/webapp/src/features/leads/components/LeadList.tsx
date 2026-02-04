/**
 * Lead list component.
 *
 * Fetches leads via useLeads() hook and renders them as LeadCard components.
 * Shows loading skeletons, empty state, or lead cards.
 */

import { Users } from 'lucide-react';
import { Skeleton, ErrorCard, EmptyState } from '@/shared/ui';
import { useLeads } from '../hooks/useLeads';
import { LeadCard } from './LeadCard';

interface LeadListProps {
  onSelectLead: (leadId: number) => void;
}

export function LeadList({ onSelectLead }: LeadListProps) {
  const { data: leads, isLoading, isError, refetch } = useLeads();

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

  if (isError) {
    return <ErrorCard message="Unable to load leads" onRetry={refetch} />;
  }

  if (!leads || leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No leads yet"
        description="Analyze prospects in the bot to build your sales pipeline."
        action={{
          label: 'Open Bot',
          onClick: () => {
            window.open('https://t.me/DealQuestBot?start=support', '_blank');
          },
        }}
      />
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
