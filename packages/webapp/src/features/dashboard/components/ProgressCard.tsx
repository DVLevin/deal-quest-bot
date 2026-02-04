/**
 * Dashboard progress card showing user's XP, level, rank, streak.
 *
 * Tapping the avatar or username navigates to /profile.
 * Shows Skeleton loading states while data is being fetched.
 */

import { Link } from 'react-router';
import { Card, Skeleton, ProgressBar, Avatar, ErrorCard } from '@/shared/ui';
import { StreakIndicator } from '@/features/gamification/components/StreakIndicator';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuthStore } from '@/features/auth/store';
import {
  getRankTitle,
  getXPForNextLevel,
  XP_PER_LEVEL,
  MAX_LEVEL,
} from '@deal-quest/shared';

export function ProgressCard() {
  const { data: user, isLoading, isError, refetch } = useUserProgress();
  const photoUrl = useAuthStore((s) => s.photoUrl);

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="mt-4">
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      </Card>
    );
  }

  if (isError || !user) {
    return <ErrorCard message="Unable to load progress" onRetry={refetch} />;
  }

  const rankTitle = getRankTitle(user.current_level);
  const nextLevelXP = getXPForNextLevel(user.current_level);
  const isMaxLevel = user.current_level >= MAX_LEVEL;

  // XP within current level: total_xp minus the threshold for current level
  const currentLevelThreshold = XP_PER_LEVEL[user.current_level - 1] ?? 0;
  const xpInCurrentLevel = user.total_xp - currentLevelThreshold;
  const xpNeededForLevel = nextLevelXP != null
    ? nextLevelXP - currentLevelThreshold
    : 0;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Link to="/profile" className="shrink-0">
          <Avatar
            firstName={user.first_name}
            username={user.username}
            photoUrl={photoUrl}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to="/profile" className="block">
            <p className="truncate font-semibold text-text-primary">
              {user.first_name || user.username || 'Agent'}
            </p>
          </Link>
          <p className="text-sm text-text-secondary">
            {rankTitle} &middot; Level {user.current_level}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {isMaxLevel ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-accent">MAX LEVEL</span>
            <span className="text-xs text-text-hint">
              {user.total_xp.toLocaleString()} XP total
            </span>
          </div>
        ) : (
          <ProgressBar
            current={xpInCurrentLevel}
            max={xpNeededForLevel}
          />
        )}
      </div>

      <div className="mt-3">
        <StreakIndicator streakDays={user.streak_days} />
      </div>
    </Card>
  );
}
