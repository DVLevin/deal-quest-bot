/**
 * Profile header showing user avatar, name, rank, level, XP, and member-since date.
 *
 * Uses useUserProfile hook directly (no props needed).
 * Loading state shows centered skeleton elements.
 */

import { Flame } from 'lucide-react';
import { Skeleton, Avatar, ErrorCard } from '@/shared/ui';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuthStore } from '@/features/auth/store';
import { getRankTitle, XP_PER_LEVEL, MAX_LEVEL } from '@deal-quest/shared';
import { Badge } from '@/shared/ui';

export function ProfileHeader() {
  const { data: user, isLoading, isError, refetch } = useUserProfile();
  const photoUrl = useAuthStore((s) => s.photoUrl);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }

  if (isError || !user) {
    return <ErrorCard message="Unable to load profile" onRetry={refetch} />;
  }

  const rankTitle = getRankTitle(user.current_level);
  const isMaxLevel = user.current_level >= MAX_LEVEL;
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Unknown';

  // XP within current level for display context
  const currentLevelThreshold = XP_PER_LEVEL[user.current_level - 1] ?? 0;
  const nextLevelThreshold = XP_PER_LEVEL[user.current_level] ?? currentLevelThreshold;
  const xpInLevel = user.total_xp - currentLevelThreshold;
  const xpNeeded = nextLevelThreshold - currentLevelThreshold;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <Avatar
        firstName={user.first_name}
        username={user.username}
        photoUrl={photoUrl}
        size="lg"
      />

      <h1 className="text-lg font-bold text-text-primary">
        {user.first_name || user.username || 'Agent'}
      </h1>

      <p className="text-sm text-text-secondary">{rankTitle}</p>

      <div className="flex items-center gap-2">
        <Badge variant="brand" size="sm">
          Level {user.current_level}
        </Badge>
        <span className="text-sm font-semibold text-text-primary">
          {isMaxLevel
            ? `${user.total_xp.toLocaleString()} XP`
            : `${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`}
        </span>
      </div>

      <p className="text-xs text-text-hint">
        Member since {memberSince}
      </p>

      <div className="flex items-center gap-1.5">
        <Flame className="h-4 w-4 text-warning" />
        <span className="text-sm text-text-secondary">
          {user.streak_days > 0
            ? `${user.streak_days} day streak`
            : 'No active streak'}
        </span>
      </div>
    </div>
  );
}
