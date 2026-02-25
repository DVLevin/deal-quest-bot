/**
 * Hook to fetch paginated list of support sessions for the current user.
 *
 * Queries the support_sessions table filtered by telegram_id, ordered by
 * created_at descending. Uses refetchOnWindowFocus so results auto-refresh
 * when returning from the bot after starting a new analysis.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { SupportSessionRow } from '@/types/tables';

export function useSupportSessions() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.support.sessions(telegramId!),
    queryFn: async (): Promise<SupportSessionRow[]> => {
      const { data, error } = await getInsforge()
        .database.from('support_sessions')
        .select('id, telegram_id, input_text, output_json, provider_used, created_at')
        .eq('telegram_id', telegramId!)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as SupportSessionRow[];
    },
    enabled: !!telegramId,
    refetchOnWindowFocus: true,
  });
}
