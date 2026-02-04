/**
 * Team overview stats cards for the admin dashboard (ADMIN-01).
 *
 * Displays three key metrics in a 3-column grid:
 * - Total users in the team
 * - Total XP earned across all users
 * - Active users within the last 7 days
 */

import { Users, Zap, Activity } from 'lucide-react';
import { Card, Skeleton } from '@/shared/ui';
import { useTeamStats } from '@/features/admin/hooks/useTeamStats';

export function TeamOverview() {
  const { data, isLoading, isError } = useTeamStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} padding="sm">
            <Skeleton height={48} />
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <p className="text-sm text-text-hint">Unable to load team stats</p>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: data.totalUsers,
      icon: Users,
      color: 'text-info',
    },
    {
      label: 'Total XP',
      value: data.totalXP.toLocaleString(),
      icon: Zap,
      color: 'text-warning',
    },
    {
      label: 'Active (7d)',
      value: data.activeUsers,
      icon: Activity,
      color: 'text-success',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} padding="sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <span className="text-lg font-bold text-text">{stat.value}</span>
            <span className="text-xs text-text-hint">{stat.label}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
