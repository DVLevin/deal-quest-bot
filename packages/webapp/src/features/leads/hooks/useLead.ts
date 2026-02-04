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
        .select('*')
        .eq('id', leadId)
        .eq('telegram_id', telegramId!)
        .limit(1);

      if (error) throw error;
      const rows = (data ?? []) as LeadRegistryRow[];
      return rows.length > 0 ? rows[0] : null;
    },
    enabled: leadId > 0 && !!telegramId,
    refetchOnWindowFocus: true,
  });
}
