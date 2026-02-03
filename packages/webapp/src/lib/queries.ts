/**
 * Query key factory for TanStack Query.
 *
 * Centralized query key definitions prevent key collisions and enable
 * targeted invalidation. Every useQuery hook should use keys from this factory.
 *
 * Pattern: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (telegramId: number) => ['users', telegramId] as const,
    leaderboard: ['users', 'leaderboard'] as const,
  },
  attempts: {
    all: ['attempts'] as const,
    byUser: (telegramId: number) => ['attempts', telegramId] as const,
    history: (telegramId: number, page: number) =>
      ['attempts', telegramId, 'history', page] as const,
    stats: (telegramId: number) => ['attempts', telegramId, 'stats'] as const,
  },
  badges: {
    all: ['badges'] as const,
    byUser: (telegramId: number) => ['badges', telegramId] as const,
  },
} as const;
