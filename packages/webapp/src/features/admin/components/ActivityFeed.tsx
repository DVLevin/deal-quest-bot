/**
 * Recent team activity feed with timestamps (ADMIN-05).
 *
 * Displays the last 20 team interactions with user name, mode badge,
 * score, and relative time (e.g., "2h ago").
 */

import { Card, Badge, Skeleton, ErrorCard } from '@/shared/ui';
import { useRecentActivity } from '@/features/admin/hooks/useRecentActivity';
import type { BadgeProps } from '@/shared/ui';

/** Compute a relative time string from an ISO date string. */
function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

/** Map attempt mode to a Badge variant. */
function getModeVariant(mode: string): BadgeProps['variant'] {
  switch (mode) {
    case 'learn':
      return 'info';
    case 'train':
      return 'warning';
    case 'support':
      return 'success';
    default:
      return 'default';
  }
}

export function ActivityFeed() {
  const { data: items, isLoading, isError, refetch } = useRecentActivity();

  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Recent Activity</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={36} />
          ))}
        </div>
      </Card>
    );
  }

  if (isError || !items) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Recent Activity</h3>
        <ErrorCard message="Unable to load recent activity" onRetry={refetch} compact />
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Recent Activity</h3>
        <p className="text-sm text-text-hint">No recent activity</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text">Recent Activity</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg bg-surface-secondary/50 px-3 py-2"
          >
            {/* User name */}
            <span className="flex-1 truncate text-sm font-medium text-text">
              {item.userName}
            </span>

            {/* Mode badge */}
            <Badge variant={getModeVariant(item.mode)} size="sm">
              {item.mode}
            </Badge>

            {/* Score */}
            <span className="text-sm font-semibold text-text">{item.score}</span>

            {/* Time ago */}
            <span className="min-w-[3.5rem] text-right text-xs text-text-hint">
              {timeAgo(item.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
