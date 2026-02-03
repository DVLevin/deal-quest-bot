/**
 * Hook to fetch the full user profile data.
 *
 * Uses the same query key as Dashboard's useUserProgress (queryKeys.users.detail),
 * so TanStack Query deduplicates the request when both are mounted.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { UserRow } from '@deal-quest/shared';

export function useUserProfile() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.users.detail(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('*')
        .eq('telegram_id', telegramId!)
        .single();

      if (error) throw error;
      return data as UserRow;
    },
    enabled: !!telegramId,
  });
}
