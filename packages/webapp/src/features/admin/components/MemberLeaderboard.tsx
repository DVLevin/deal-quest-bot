/**
 * Full team leaderboard ranked by XP (ADMIN-03).
 *
 * Displays all team members with their rank, display name, total XP,
 * and average score. Top 3 members get accent-colored rank numbers.
 */

import { Card, Skeleton, ErrorCard } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useTeamLeaderboard } from '@/features/admin/hooks/useTeamLeaderboard';

export function MemberLeaderboard() {
  const { data: entries, isLoading, isError, refetch } = useTeamLeaderboard();

  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Team Leaderboard</h3>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height={36} />
          ))}
        </div>
      </Card>
    );
  }

  if (isError || !entries) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Team Leaderboard</h3>
        <ErrorCard message="Unable to load leaderboard" onRetry={refetch} compact />
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Team Leaderboard</h3>
        <p className="text-sm text-text-hint">No team members</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text">Team Leaderboard</h3>
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const displayName =
            entry.user.first_name || entry.user.username || `User ${entry.user.telegram_id}`;

          return (
            <div
              key={entry.user.id}
              className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2"
            >
              {/* Rank */}
              <span
                className={cn(
                  'w-6 text-center text-sm font-bold',
                  rank <= 3 ? 'text-accent' : 'text-text-hint',
                )}
              >
                #{rank}
              </span>

              {/* Name */}
              <span className="flex-1 truncate text-sm font-medium text-text">
                {displayName}
              </span>

              {/* Average score */}
              <span className="text-xs text-text-hint">
                Avg {Math.round(entry.avgScore)}
              </span>

              {/* XP */}
              <span className="text-sm font-semibold text-accent">
                {entry.user.total_xp.toLocaleString()} XP
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
