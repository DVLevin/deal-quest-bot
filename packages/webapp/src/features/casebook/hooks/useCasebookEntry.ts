/**
 * Hook to fetch a single casebook entry by ID.
 *
 * Queries the casebook table by id. Returns the entry or null if not found.
 * Casebook entries are team-wide (no telegram_id filter needed).
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { CasebookRow } from '@/types/tables';

export function useCasebookEntry(entryId: number) {
  return useQuery({
    queryKey: queryKeys.casebook.entry(entryId),
    queryFn: async (): Promise<CasebookRow | null> => {
      const { data, error } = await getInsforge()
        .database.from('casebook')
        .select('*')
        .eq('id', entryId)
        .limit(1);

      if (error) throw error;
      const rows = (data ?? []) as CasebookRow[];
      return rows.length > 0 ? rows[0] : null;
    },
    enabled: !!entryId,
  });
}
