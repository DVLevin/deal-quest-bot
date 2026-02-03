/**
 * Static badge definitions and client-side evaluation logic.
 *
 * Badge data is defined as a static constant because there is no badges table
 * in the database yet (planned for Phase 6). Badges are evaluated client-side
 * by checking user XP, streak, attempt count, and scores against criteria.
 *
 * When Phase 6 creates the badges/user_badges tables, these hooks can be
 * updated to query the database instead.
 */

import type { UserRow, AttemptRow } from '@deal-quest/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeCriteria =
  | { type: 'xp_threshold'; threshold: number }
  | { type: 'streak_days'; days: number }
  | { type: 'attempt_count'; count: number }
  | { type: 'perfect_score' }
  | { type: 'first_attempt' };

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name */
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: BadgeCriteria;
}

export interface EarnedBadge extends BadgeDefinition {
  /** Approximate earned date (null until badges table tracks this) */
  earnedAt: string | null;
}

// ---------------------------------------------------------------------------
// Badge Definitions (8 badges)
// ---------------------------------------------------------------------------

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-win',
    name: 'First Win',
    description: 'Complete your first scenario',
    icon: 'trophy',
    rarity: 'common',
    criteria: { type: 'first_attempt' },
  },
  {
    id: 'on-fire',
    name: 'On Fire',
    description: '3-day streak',
    icon: 'flame',
    rarity: 'common',
    criteria: { type: 'streak_days', days: 3 },
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Score 100/100 on a scenario',
    icon: 'star',
    rarity: 'rare',
    criteria: { type: 'perfect_score' },
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 10 scenarios',
    icon: 'target',
    rarity: 'common',
    criteria: { type: 'attempt_count', count: 10 },
  },
  {
    id: 'xp-hunter',
    name: 'XP Hunter',
    description: 'Earn 1000 XP',
    icon: 'zap',
    rarity: 'rare',
    criteria: { type: 'xp_threshold', threshold: 1000 },
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Complete 50 scenarios',
    icon: 'shield',
    rarity: 'epic',
    criteria: { type: 'attempt_count', count: 50 },
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: '7-day streak',
    icon: 'flame',
    rarity: 'rare',
    criteria: { type: 'streak_days', days: 7 },
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Earn 3000 XP',
    icon: 'gem',
    rarity: 'legendary',
    criteria: { type: 'xp_threshold', threshold: 3000 },
  },
];

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate which badges a user has earned based on their user data and attempts.
 * Pure function -- no database queries. Checks each badge criteria against user stats.
 */
export function evaluateBadges(user: UserRow, attempts: AttemptRow[]): EarnedBadge[] {
  const earned: EarnedBadge[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    let isEarned = false;

    switch (badge.criteria.type) {
      case 'xp_threshold':
        isEarned = user.total_xp >= badge.criteria.threshold;
        break;
      case 'streak_days':
        isEarned = user.streak_days >= badge.criteria.days;
        break;
      case 'attempt_count':
        isEarned = attempts.length >= badge.criteria.count;
        break;
      case 'perfect_score':
        isEarned = attempts.some((a) => a.score === 100);
        break;
      case 'first_attempt':
        isEarned = attempts.length > 0;
        break;
    }

    if (isEarned) {
      earned.push({ ...badge, earnedAt: null });
    }
  }

  return earned;
}
