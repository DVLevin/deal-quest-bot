/**
 * Dashboard leaderboard widget -- top 5 users by XP.
 *
 * Highlights the current user's row. If the current user is not in the
 * top 5, shows their position below with a separator.
 *
 * Handles RLS restriction gracefully -- if only 1 row returned matching
 * the current user, shows an empty state.
 */

import { Card, Skeleton, Badge, Avatar, ErrorCard } from '@/shared/ui';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/shared/lib/cn';
import type { UserRow } from '@deal-quest/shared';

function LeaderboardRow({
  user,
  position,
  isCurrentUser,
  photoUrl,
}: {
  user: UserRow;
  position: number;
  isCurrentUser: boolean;
  photoUrl?: string | null;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-2',
        isCurrentUser && 'bg-brand-50',
        position === 1 && 'border border-rarity-legendary/40',
        position === 2 && 'border border-rarity-epic/30',
        position === 3 && 'border border-rarity-rare/30',
      )}
      style={position === 1 ? { boxShadow: '0 0 6px oklch(0.70 0.22 65 / 0.2)' } : undefined}
    >
      <span
        className={cn(
          'w-5 text-center text-sm font-semibold',
          position === 1
            ? 'font-bold text-rarity-legendary'
            : position === 2
              ? 'font-bold text-rarity-epic'
              : position === 3
                ? 'font-bold text-rarity-rare'
                : 'text-text-hint',
        )}
      >
        {position}
      </span>
      <Avatar
        firstName={user.first_name}
        username={user.username}
        photoUrl={photoUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {user.first_name || user.username || 'Agent'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-hint">
          {user.total_xp.toLocaleString()} XP
        </span>
        <Badge size="sm" variant="brand">
          Lv.{user.current_level}
        </Badge>
      </div>
    </div>
  );
}

export function LeaderboardWidget() {
  const { data, isLoading, isError, refetch } = useLeaderboard();
  const telegramId = useAuthStore((s) => s.telegramId);
  const photoUrl = useAuthStore((s) => s.photoUrl);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text-primary">
        Leaderboard
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-2">
              <Skeleton className="h-4 w-5" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorCard message="Unable to load leaderboard" onRetry={refetch} compact />
      ) : !data || data.top5.length === 0 ? (
        <p className="text-sm text-text-hint">
          Complete your first scenario to join the leaderboard!
        </p>
      ) : data.top5.length === 1 &&
        data.top5[0].telegram_id === telegramId ? (
        // RLS may restrict cross-user reads -- show graceful empty state
        <p className="text-sm text-text-hint">
          Leaderboard unavailable -- keep training to climb the ranks!
        </p>
      ) : (
        <div className="space-y-1">
          {data.top5.map((user, i) => (
            <LeaderboardRow
              key={user.id}
              user={user}
              position={i + 1}
              isCurrentUser={user.telegram_id === telegramId}
              photoUrl={user.telegram_id === telegramId ? photoUrl : undefined}
            />
          ))}
          {data.myPosition != null && data.myPosition > 5 && data.myEntry && (
            <>
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="flex-1 border-t border-surface-secondary" />
                <span className="text-xs text-text-hint">...</span>
                <span className="flex-1 border-t border-surface-secondary" />
              </div>
              <LeaderboardRow
                user={data.myEntry}
                position={data.myPosition}
                isCurrentUser
                photoUrl={photoUrl}
              />
            </>
          )}
        </div>
      )}
    </Card>
  );
}
