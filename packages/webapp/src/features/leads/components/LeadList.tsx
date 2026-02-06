/**
 * Lead list component.
 *
 * Fetches leads via useLeads() hook and renders them as LeadCard components.
 * Uses useLeadReminders() for batched reminder data to compute plan progress
 * without N+1 queries.
 *
 * Shows loading skeletons, empty state, or lead cards with progress info.
 */

import { Users } from 'lucide-react';
import { Skeleton, ErrorCard, EmptyState } from '@/shared/ui';
import { useLeads } from '../hooks/useLeads';
import { useLeadReminders } from '../hooks/useLeadReminders';
import { computePlanProgress } from '../types';
import { LeadCard } from './LeadCard';

interface LeadListProps {
  onSelectLead: (leadId: number) => void;
}

export function LeadList({ onSelectLead }: LeadListProps) {
  const { data: leads, isLoading, isError, refetch } = useLeads();
  const { data: reminders } = useLeadReminders();

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
      {leads.map((lead) => {
        const progress = computePlanProgress(
          lead.engagement_plan,
          reminders?.get(lead.id) ?? null,
        );
        return (
          <LeadCard
            key={lead.id}
            lead={lead}
            progress={progress}
            onClick={() => onSelectLead(lead.id)}
          />
        );
      })}
    </div>
  );
}
