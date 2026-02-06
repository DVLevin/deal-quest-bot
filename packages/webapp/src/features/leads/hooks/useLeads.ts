/**
 * Hook to fetch paginated lead list for the current user.
 *
 * Selects only lightweight columns for list display (no large text fields).
 * Orders by updated_at descending, limits to 30 rows.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { LeadRegistryRow } from '@/types/tables';

export type LeadListItem = Pick<
  LeadRegistryRow,
  | 'id'
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

export function useLeads() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.leads.byUser(telegramId!),
    queryFn: async (): Promise<LeadListItem[]> => {
      const { data, error } = await getInsforge()
        .database.from('lead_registry')
        .select(
          'id, prospect_name, prospect_first_name, prospect_last_name, prospect_company, prospect_title, status, photo_url, input_type, engagement_plan, created_at, updated_at',
        )
        .eq('telegram_id', telegramId!)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data ?? []) as LeadListItem[];
    },
    enabled: !!telegramId,
    refetchOnWindowFocus: true,
  });
}
