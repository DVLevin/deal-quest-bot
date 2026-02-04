/**
 * Hook to fetch activity log entries for a lead.
 *
 * Queries lead_activity_log table, ordered by most recent first.
 * Returns up to 50 entries per lead.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { LeadActivityRow } from '@/types/tables';

export function useLeadActivities(leadId: number) {
  return useQuery<LeadActivityRow[]>({
    queryKey: queryKeys.leads.activities(leadId),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('lead_activity_log')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as LeadActivityRow[]) ?? [];
    },
    enabled: leadId > 0,
  });
}
