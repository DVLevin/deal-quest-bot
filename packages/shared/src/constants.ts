/**
 * Game constants for the Deal Quest progression system.
 *
 * These values are shared between the TMA frontend (for display)
 * and could be referenced by the bot backend (for validation).
 */

/**
 * XP required to reach each level.
 * Index 0 = Level 1 (starting), Index 7 = Level 8.
 * XP is cumulative: reaching Level 3 requires XP_PER_LEVEL[2] total XP.
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

/**
 * Rank titles corresponding to user levels 1-8+.
 * Used for display in profile, leaderboard, and level-up animations.
 */
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

/**
 * Minimum score (out of 100) required to pass a scenario
 * and unlock the next level in a learning track.
 */
export const PASSING_SCORE = 60;

/**
 * Maximum bonus XP awarded for maintaining a daily streak.
 */
export const MAX_STREAK_BONUS_XP = 50;

/**
 * Ordered lead pipeline statuses for display in the leads pipeline view.
 * Order represents the natural progression of a sales lead.
 */
export const LEAD_STATUSES = [
  'analyzed',
  'reached_out',
  'meeting',
  'in_progress',
  'closed',
] as const;

/**
 * Difficulty labels for scenario display.
 */
export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
} as const;

/**
 * Maximum user level in the current progression system.
 */
export const MAX_LEVEL = 8;

/**
 * Get the rank title for a given level.
 * Levels above MAX_LEVEL return the highest rank title.
 */
export function getRankTitle(level: number): string {
  const index = Math.min(Math.max(level - 1, 0), RANK_TITLES.length - 1);
  return RANK_TITLES[index];
}

/**
 * Get the XP required to reach the next level.
 * Returns null if already at max level.
 */
export function getXPForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= MAX_LEVEL) return null;
  return XP_PER_LEVEL[currentLevel]; // currentLevel is 1-based, array is 0-based
}
