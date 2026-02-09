/**
 * Hook to fetch a single lead with all fields.
 *
 * Queries lead_registry by id only, then performs a client-side auth check:
 * the user must either own the lead (telegram_id match) or be assigned to it
 * via lead_assignments.
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
      // 1. Fetch lead by id (no telegram_id filter — assigned users need access)
      const { data, error } = await getInsforge()
        .database.from('lead_registry')
        .select('id, user_id, telegram_id, prospect_name, prospect_first_name, prospect_last_name, prospect_title, prospect_company, prospect_geography, photo_url, photo_key, prospect_analysis, closing_strategy, engagement_tactics, draft_response, status, notes, input_type, web_research, engagement_plan, lead_source, created_at, updated_at')
        .eq('id', leadId)
        .limit(1);

      if (error) throw error;
      const rows = (data ?? []) as unknown as LeadRegistryRow[];
      if (rows.length === 0) return null;

      const lead = rows[0];

      // 2. If user owns the lead, return immediately
      if (lead.telegram_id === telegramId) return lead;

      // 3. Otherwise check if user is assigned
      const { data: assignment, error: assignErr } = await getInsforge()
        .database.from('lead_assignments')
        .select('id')
        .eq('lead_id', leadId)
        .eq('telegram_id', telegramId!)
        .limit(1);

      if (assignErr) throw assignErr;
      if (assignment && assignment.length > 0) return lead;

      // Not authorized to view this lead
      return null;
    },
    enabled: leadId > 0 && !!telegramId,
    refetchOnWindowFocus: true,
  });
}
