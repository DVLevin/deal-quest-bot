/**
 * Hook to fetch paginated lead list for the current user.
 *
 * Fetches leads the user owns (telegram_id match) plus leads they are
 * assigned to via lead_assignments. Merges both sets, deduplicates by id,
 * and orders by updated_at descending.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { LeadRegistryRow } from '@/types/tables';

export type LeadListItem = Pick<
  LeadRegistryRow,
  | 'id'
  | 'telegram_id'
  | 'prospect_name'
  | 'prospect_first_name'
  | 'prospect_last_name'
  | 'prospect_company'
  | 'prospect_title'
  | 'status'
  | 'photo_url'
  | 'input_type'
  | 'engagement_plan'
  | 'created_at'
  | 'updated_at'
>;

const LEAD_LIST_COLUMNS =
  'id, telegram_id, prospect_name, prospect_first_name, prospect_last_name, prospect_company, prospect_title, status, photo_url, input_type, engagement_plan, created_at, updated_at';

export function useLeads() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.leads.byUser(telegramId!),
    queryFn: async (): Promise<LeadListItem[]> => {
      const db = getInsforge().database;

      // 1. Fetch owned leads
      const { data: ownedData, error: ownedError } = await db
        .from('lead_registry')
        .select(LEAD_LIST_COLUMNS)
        .eq('telegram_id', telegramId!)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (ownedError) throw ownedError;
      const owned = (ownedData ?? []) as LeadListItem[];

      // 2. Fetch assignments for this user
      const { data: assignmentData, error: assignmentError } = await db
        .from('lead_assignments')
        .select('lead_id')
        .eq('telegram_id', telegramId!);

      if (assignmentError) throw assignmentError;
      const assignedLeadIds = (assignmentData ?? []).map(
        (a: { lead_id: number }) => a.lead_id,
      );

      // 3. Find assigned IDs not already owned
      const ownedIds = new Set(owned.map((l) => l.id));
      const missingIds = assignedLeadIds.filter((id: number) => !ownedIds.has(id));

      if (missingIds.length === 0) return owned;

      // 4. Fetch assigned leads not already in owned set
      const { data: assignedData, error: assignedError } = await db
        .from('lead_registry')
        .select(LEAD_LIST_COLUMNS)
        .in('id', missingIds)
        .order('updated_at', { ascending: false });

      if (assignedError) throw assignedError;
      const assigned = (assignedData ?? []) as LeadListItem[];

      // 5. Merge and sort by updated_at descending
      const merged = [...owned, ...assigned];
      merged.sort((a, b) => {
        const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
        return bTime - aTime;
      });

      return merged;
    },
    enabled: !!telegramId,
    refetchOnWindowFocus: true,
  });
}
