/**
 * Route guard that restricts admin pages to authorized usernames.
 *
 * Fetches the current user's data to get their username, then checks
 * against the VITE_ADMIN_USERNAMES list. Non-admin users are redirected
 * to the dashboard. Shows a skeleton while loading.
 *
 * Reuses the existing user query key -- TanStack Query deduplicates
 * if the user data is already cached from the dashboard.
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import { isAdminUsername } from '@/features/admin/lib/adminAccess';
import { Skeleton } from '@/shared/ui';
import type { UserRow } from '@/types';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const telegramId = useAuthStore((s) => s.telegramId);

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('id, telegram_id, username, first_name, total_xp, current_level, streak_days, last_active_at, created_at')
        .eq('telegram_id', telegramId!)
        .single();

      if (error) throw error;
      return data as UserRow;
    },
    enabled: !!telegramId,
  });

  if (isLoading || !telegramId) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton height={28} width="40%" />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
    );
  }

  if (!isAdminUsername(user?.username)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
