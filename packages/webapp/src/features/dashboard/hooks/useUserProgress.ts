/**
 * Hook to fetch the current user's progress data (XP, level, rank, streak).
 *
 * Uses TanStack Query with InsForge PostgREST for data fetching.
 * The query is gated on telegramId (auth must complete first).
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { UserRow } from '@deal-quest/shared';

export function useUserProgress() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.users.detail(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select(
          'id, telegram_id, username, first_name, total_xp, current_level, streak_days, last_active_at, created_at',
        )
        .eq('telegram_id', telegramId!)
        .single();

      if (error) throw error;
      return data as UserRow;
    },
    enabled: !!telegramId,
  });
}
