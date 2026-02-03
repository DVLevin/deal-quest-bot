/**
 * Game constants for the Deal Quest progression system.
 *
 * Source of truth: packages/shared/src/constants.ts
 * This is a build-time copy for Railway deployment (root_dir isolation).
 */

export const XP_PER_LEVEL: readonly number[] = [
  0,     // Level 1: Starting level (0 XP)
  100,   // Level 2: 100 XP
  300,   // Level 3: 300 XP
  600,   // Level 4: 600 XP
  1000,  // Level 5: 1000 XP
  1500,  // Level 6: 1500 XP
  2200,  // Level 7: 2200 XP
  3000,  // Level 8: 3000 XP (max level)
] as const;

export const RANK_TITLES: readonly string[] = [
  'Rookie',      // Level 1
  'Apprentice',  // Level 2
  'Associate',   // Level 3
  'Specialist',  // Level 4
  'Expert',      // Level 5
  'Master',      // Level 6
  'Champion',    // Level 7
  'Legend',       // Level 8+
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

export const MAX_LEVEL = 8;

export function getRankTitle(level: number): string {
  const index = Math.min(Math.max(level - 1, 0), RANK_TITLES.length - 1);
  return RANK_TITLES[index];
}

export function getXPForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= MAX_LEVEL) return null;
  return XP_PER_LEVEL[currentLevel];
}
