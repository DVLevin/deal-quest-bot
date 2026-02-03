/**
 * Game constants for the Deal Quest progression system.
 *
 * Source of truth: packages/shared/src/constants.ts
 * This is a build-time copy for Railway deployment (root_dir isolation).
 */

export const XP_PER_LEVEL: readonly number[] = [
  0,      // Level 1: Starting level (0 XP)
  200,    // Level 2: 200 XP (need 1*200 to advance from L1)
  600,    // Level 3: 600 XP (need 2*200 to advance from L2)
  1200,   // Level 4: 1200 XP (need 3*200 to advance from L3)
  2000,   // Level 5: 2000 XP (need 4*200 to advance from L4)
  3000,   // Level 6: 3000 XP (need 5*200 to advance from L5)
  4200,   // Level 7: 4200 XP (need 6*200 to advance from L6)
  5600,   // Level 8: 5600 XP (need 7*200 to advance from L7)
  7200,   // Level 9: 7200 XP (need 8*200 to advance from L8)
  9000,   // Level 10: 9000 XP (need 9*200 to advance from L9)
] as const;

export const RANK_TITLES: readonly string[] = [
  'Rookie',            // Level 1
  'Associate',         // Level 2
  'Specialist',        // Level 3
  'Expert',            // Level 4
  'Strategist',        // Level 5
  'Deal Closer',       // Level 6
  'Senior Advisor',    // Level 7
  'Master Negotiator', // Level 8
  'VP of Deals',       // Level 9
  'Deal Legend',        // Level 10+
] as const;

export const PASSING_SCORE = 60;

export const MAX_STREAK_BONUS_XP = 50;

export const LEAD_STATUSES = [
  'analyzed',
  'reached_out',
  'meeting',
  'in_progress',
  'closed',
] as const;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
} as const;

export const MAX_LEVEL = 10;

export function getRankTitle(level: number): string {
  const index = Math.min(Math.max(level - 1, 0), RANK_TITLES.length - 1);
  return RANK_TITLES[index];
}

export function getXPForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= MAX_LEVEL) return null;
  return XP_PER_LEVEL[currentLevel];
}
