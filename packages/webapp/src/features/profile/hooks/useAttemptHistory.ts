/**
 * Hook for paginated attempt history.
 *
 * Supports page-based navigation with range() queries.
 * Uses keepPreviousData for smooth transitions between pages.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { AttemptRow } from '@deal-quest/shared';

const PAGE_SIZE = 10;

/** Subset of AttemptRow fields returned by the select query */
export type AttemptHistoryItem = Pick<
  AttemptRow,
  'id' | 'scenario_id' | 'mode' | 'score' | 'xp_earned' | 'created_at'
>;

interface AttemptHistoryResult {
  attempts: AttemptHistoryItem[];
  total: number;
  hasMore: boolean;
}

export function useAttemptHistory(page: number) {
  const telegramId = useAuthStore((s) => s.telegramId);

  const query = useQuery({
    queryKey: queryKeys.attempts.history(telegramId!, page),
    queryFn: async (): Promise<AttemptHistoryResult> => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await getInsforge()
        .database.from('attempts')
        .select('id, scenario_id, mode, score, xp_earned, created_at', { count: 'exact' })
        .eq('telegram_id', telegramId!)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const total = count ?? 0;
      const attempts = (data ?? []) as AttemptHistoryItem[];

      return {
        attempts,
        total,
        hasMore: from + attempts.length < total,
      };
    },
    enabled: !!telegramId,
    placeholderData: keepPreviousData,
  });

  return {
    attempts: query.data?.attempts ?? [],
    total: query.data?.total ?? 0,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export { PAGE_SIZE };
