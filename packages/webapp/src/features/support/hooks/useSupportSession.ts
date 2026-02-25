/**
 * Hook to fetch a single support session by ID.
 *
 * Queries support_sessions table by id and telegram_id for security.
 * Returns the session row or null if not found.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { SupportSessionRow } from '@/types/tables';

export function useSupportSession(sessionId: number) {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.support.session(sessionId),
    queryFn: async (): Promise<SupportSessionRow | null> => {
      const { data, error } = await getInsforge()
        .database.from('support_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('telegram_id', telegramId!)
        .limit(1);

      if (error) throw error;
      const rows = (data ?? []) as SupportSessionRow[];
      return rows.length > 0 ? rows[0] : null;
    },
    enabled: !!telegramId && !!sessionId,
    refetchOnWindowFocus: true,
  });
}
