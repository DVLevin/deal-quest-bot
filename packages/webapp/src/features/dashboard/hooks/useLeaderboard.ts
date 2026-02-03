/**
 * Hook to fetch the top-5 leaderboard with the current user's position.
 *
 * Fetches top 10 users by total_xp, displays top 5, and finds the
 * current user's position in the full list.
 *
 * NOTE on RLS: The leaderboard query may return only the current user's
 * row if RLS restricts cross-user reads. Handle this gracefully -- show
 * "Leaderboard unavailable" empty state. The RLS policy for cross-user
 * reads is a pending Phase 1 todo (01-02 open question).
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { UserRow } from '@deal-quest/shared';

interface LeaderboardResult {
  top5: UserRow[];
  myPosition: number | null;
  myEntry: UserRow | null;
}

export function useLeaderboard() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.users.leaderboard,
    queryFn: async (): Promise<LeaderboardResult> => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('id, telegram_id, username, first_name, total_xp, current_level')
        .order('total_xp', { ascending: false })
        .limit(10);

      if (error) throw error;

      const allUsers = (data ?? []) as UserRow[];
      const myIndex = allUsers.findIndex(
        (u) => u.telegram_id === telegramId,
      );

      return {
        top5: allUsers.slice(0, 5),
        myPosition: myIndex >= 0 ? myIndex + 1 : null,
        myEntry: myIndex >= 0 ? allUsers[myIndex] : null,
      };
    },
    enabled: !!telegramId,
    staleTime: 2 * 60_000, // 2 minutes -- leaderboard changes frequently
  });
}
