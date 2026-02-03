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
    latest: (telegramId: number, scenarioId: string, mode: string) =>
      ['attempts', telegramId, 'latest', scenarioId, mode] as const,
  },
  badges: {
    all: ['badges'] as const,
    byUser: (telegramId: number) => ['badges', telegramId] as const,
  },
  trackProgress: {
    all: ['trackProgress'] as const,
    byTrack: (telegramId: number, trackId: string) =>
      ['trackProgress', telegramId, trackId] as const,
    level: (telegramId: number, trackId: string, levelId: string) =>
      ['trackProgress', telegramId, trackId, levelId] as const,
  },
  scenarios: {
    all: ['scenarios'] as const,
    pool: (difficulty?: number) => ['scenarios', 'pool', difficulty] as const,
    seen: (telegramId: number) => ['scenarios', 'seen', telegramId] as const,
  },
} as const;
