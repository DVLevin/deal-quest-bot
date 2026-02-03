/**
 * Dashboard page -- the main landing page of the TMA.
 *
 * Displays user progress (XP, level, rank, streak), recent badges,
 * leaderboard, and quick-action navigation buttons.
 *
 * All data fetching is handled inside the feature components via
 * their own TanStack Query hooks.
 */

import { ProgressCard } from '@/features/dashboard/components/ProgressCard';
import { BadgePreview } from '@/features/dashboard/components/BadgePreview';
import { LeaderboardWidget } from '@/features/dashboard/components/LeaderboardWidget';
import { QuickActions } from '@/features/dashboard/components/QuickActions';

export default function Dashboard() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <ProgressCard />
      <QuickActions />
      <BadgePreview />
      <LeaderboardWidget />
    </div>
  );
}
