/**
 * Hook to fetch a single lead with all fields.
 *
 * Queries lead_registry by id and telegram_id for security.
 * Returns the full lead row or null if not found.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { LeadRegistryRow } from '@/types/tables';

export function useLead(leadId: number) {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.leads.detail(leadId),
    queryFn: async (): Promise<LeadRegistryRow | null> => {
      const { data, error } = await getInsforge()
        .database.from('lead_registry')
        .select('id, user_id, telegram_id, prospect_name, prospect_first_name, prospect_last_name, prospect_title, prospect_company, prospect_geography, photo_url, photo_key, prospect_analysis, closing_strategy, engagement_tactics, draft_response, status, notes, input_type, web_research, engagement_plan, lead_source, created_at, updated_at')
        .eq('id', leadId)
        .eq('telegram_id', telegramId!)
        .limit(1);

      if (error) throw error;
      const rows = (data ?? []) as unknown as LeadRegistryRow[];
      return rows.length > 0 ? rows[0] : null;
    },
    enabled: leadId > 0 && !!telegramId,
    refetchOnWindowFocus: true,
  });
}
