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
  support: {
    all: ['support'] as const,
    sessions: (telegramId: number) => ['support', telegramId, 'sessions'] as const,
    session: (sessionId: number) => ['support', 'session', sessionId] as const,
  },
  casebook: {
    all: ['casebook'] as const,
    list: (filters: Record<string, unknown>) => ['casebook', 'list', filters] as const,
    entry: (entryId: number) => ['casebook', 'entry', entryId] as const,
    filterOptions: ['casebook', 'filterOptions'] as const,
  },
  leads: {
    all: ['leads'] as const,
    byUser: (telegramId: number) => ['leads', telegramId] as const,
    detail: (leadId: number) => ['leads', 'detail', leadId] as const,
    activities: (leadId: number) => ['leads', 'activities', leadId] as const,
  },
  settings: {
    user: (telegramId: number) => ['settings', telegramId] as const,
  },
  admin: {
    all: ['admin'] as const,
    teamStats: ['admin', 'teamStats'] as const,
    leaderboard: ['admin', 'leaderboard'] as const,
    weakAreas: ['admin', 'weakAreas'] as const,
    recentActivity: ['admin', 'recentActivity'] as const,
  },
} as const;
