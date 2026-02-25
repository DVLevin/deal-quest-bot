/**
 * Hook to fetch ALL leads across all users for the admin pipeline view.
 *
 * Fetches all leads and all users in parallel, builds an owner name lookup map.
 * Returns leads sorted by updated_at descending with owner display names.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { UserRow } from '@/types';
import type { LeadListItem } from '@/features/leads/hooks/useLeads';

export interface AdminLeadItem extends LeadListItem {
  ownerName: string;
}

export function useAdminLeads() {
  return useQuery({
    queryKey: queryKeys.admin.allLeads,
    queryFn: async (): Promise<AdminLeadItem[]> => {
      const db = getInsforge().database;

      const [leadsResult, usersResult] = await Promise.all([
        db
          .from('lead_registry')
          .select(
            'id, telegram_id, prospect_name, prospect_first_name, prospect_last_name, prospect_company, prospect_title, status, photo_url, input_type, engagement_plan, created_at, updated_at',
          )
          .order('updated_at', { ascending: false })
          .limit(200),
        db
          .from('users')
          .select('telegram_id, username, first_name')
          .limit(50),
      ]);

      if (leadsResult.error) throw leadsResult.error;
      if (usersResult.error) throw usersResult.error;

      const leads = (leadsResult.data ?? []) as LeadListItem[];
      const users = (usersResult.data ?? []) as Pick<UserRow, 'telegram_id' | 'username' | 'first_name'>[];

      // Build owner name lookup
      const nameMap = new Map<number, string>();
      for (const u of users) {
        nameMap.set(u.telegram_id, u.first_name || u.username || `User ${u.telegram_id}`);
      }

      return leads.map((lead) => ({
        ...lead,
        ownerName: nameMap.get(lead.telegram_id) ?? `User ${lead.telegram_id}`,
      }));
    },
    staleTime: 5 * 60_000,
  });
}
