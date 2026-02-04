/**
 * Admin dashboard page composing all team analytics sections.
 *
 * Renders team overview stats, weekly performance chart, member leaderboard,
 * weak areas, and activity feed. Access is controlled by AdminGuard in the router.
 */

import { TeamOverview } from '@/features/admin/components/TeamOverview';
import { PerformanceChart } from '@/features/admin/components/PerformanceChart';
import { MemberLeaderboard } from '@/features/admin/components/MemberLeaderboard';
import { WeakAreas } from '@/features/admin/components/WeakAreas';
import { ActivityFeed } from '@/features/admin/components/ActivityFeed';

export default function Admin() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-xl font-bold text-text">Team Dashboard</h1>
      <TeamOverview />
      <PerformanceChart />
      <MemberLeaderboard />
      <WeakAreas />
      <ActivityFeed />
    </div>
  );
}
