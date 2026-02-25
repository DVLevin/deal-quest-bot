/**
 * Lead list component.
 *
 * Fetches leads via useLeads() hook and renders them as LeadCard components.
 * Uses useLeadReminders() for batched reminder data to compute plan progress
 * without N+1 queries.
 *
 * Shows loading skeletons, empty state, or lead cards with progress info.
 * Includes a pipeline summary bar above the cards showing Active/Stale/Closed counts.
 *
 * For leads assigned to the user (not owned), fetches owner display names
 * and passes them to LeadCard.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Skeleton, ErrorCard, EmptyState } from '@/shared/ui';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { useLeads } from '../hooks/useLeads';
import { useLeadReminders } from '../hooks/useLeadReminders';
import { computePlanProgress } from '../types';
import { LeadCard } from './LeadCard';
import type { UserRow } from '@/types';

interface LeadListProps {
  onSelectLead: (leadId: number) => void;
}

export function LeadList({ onSelectLead }: LeadListProps) {
  const telegramId = useAuthStore((s) => s.telegramId);
  const { data: leads, isLoading, isError, refetch } = useLeads();
  const { data: reminders } = useLeadReminders();

  // Collect telegram_ids of owners for assigned (non-owned) leads
  const ownerTelegramIds = useMemo(() => {
    if (!leads || !telegramId) return [];
    const ids = new Set<number>();
    for (const lead of leads) {
      if (lead.telegram_id !== telegramId) {
        ids.add(lead.telegram_id);
      }
    }
    return Array.from(ids);
  }, [leads, telegramId]);

  // Fetch owner display names for assigned leads
  const { data: ownerNames } = useQuery({
    queryKey: ['leads', 'ownerNames', ownerTelegramIds],
    queryFn: async (): Promise<Map<number, string>> => {
      if (ownerTelegramIds.length === 0) return new Map();
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('telegram_id, first_name, username')
        .in('telegram_id', ownerTelegramIds);

      if (error) throw error;
      const map = new Map<number, string>();
      for (const u of (data ?? []) as Pick<UserRow, 'telegram_id' | 'first_name' | 'username'>[]) {
        map.set(u.telegram_id, u.first_name || u.username || `User ${u.telegram_id}`);
      }
      return map;
    },
    enabled: ownerTelegramIds.length > 0,
    staleTime: 5 * 60_000,
  });

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
        const isAssigned = telegramId != null && lead.telegram_id !== telegramId;
        const ownerName = isAssigned ? ownerNames?.get(lead.telegram_id) : undefined;
        return (
          <LeadCard
            key={lead.id}
            lead={lead}
            progress={progress}
            onClick={() => onSelectLead(lead.id)}
            ownerName={ownerName}
          />
        );
      })}
    </div>
  );
}
