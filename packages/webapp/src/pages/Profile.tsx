/**
 * Profile page -- full user profile with stats, badges, and attempt history.
 *
 * Replaces the stub from Phase 1. Renders:
 * - ProfileHeader: avatar, name, rank, level, XP, member-since, streak
 * - StatsOverview: aggregate stats grid
 * - BadgeWall: rarity-styled badge grid (earned + locked) from gamification feature
 * - AttemptHistory: paginated attempt list
 */

import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { StatsOverview } from '@/features/profile/components/StatsOverview';
import { BadgeWall } from '@/features/gamification/components/BadgeWall';
import { AttemptHistory } from '@/features/profile/components/AttemptHistory';
import { SettingsPanel } from '@/features/settings/components/SettingsPanel';

export default function Profile() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-4">
      <ProfileHeader />
      <StatsOverview />
      <BadgeWall />
      <AttemptHistory />
      <SettingsPanel />
    </div>
  );
}
