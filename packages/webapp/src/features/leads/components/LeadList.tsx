/**
 * Lead list component.
 *
 * Fetches leads via useLeads() hook and renders them as LeadCard components.
 * Uses useLeadReminders() for batched reminder data to compute plan progress
 * without N+1 queries.
 *
 * Shows loading skeletons, empty state, or lead cards with progress info.
 * Includes a pipeline summary bar above the cards showing Active/Stale/Closed counts.
 */

import { useMemo } from 'react';
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

  const statusCounts = useMemo(() => {
    if (!leads || leads.length === 0) return null;
    let active = 0;
    let stale = 0;
    let closed = 0;
    const now = Date.now();
    const STALE_MS = 7 * 24 * 60 * 60 * 1000;
    for (const lead of leads) {
      if (lead.status === 'closed_won' || lead.status === 'closed_lost') {
        closed++;
      } else {
        active++;
        const updatedAt = new Date(lead.updated_at ?? lead.created_at ?? 0).getTime();
        if (now - updatedAt > STALE_MS) {
          stale++;
        }
      }
    }
    return { active, stale, closed, total: leads.length };
  }, [leads]);

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
      {statusCounts && (
        <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2 text-xs font-medium">
          <span className="text-text-secondary">{statusCounts.total} leads</span>
          <span className="text-text-hint">|</span>
          <span className="text-accent">{statusCounts.active} Active</span>
          {statusCounts.stale > 0 && (
            <>
              <span className="text-text-hint">|</span>
              <span className="text-warning">{statusCounts.stale} Stale</span>
            </>
          )}
          <span className="text-text-hint">|</span>
          <span className="text-text-secondary">{statusCounts.closed} Closed</span>
        </div>
      )}
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
