/**
 * Game constants for the Deal Quest progression system.
 *
 * These values are shared between the TMA frontend (for display)
 * and could be referenced by the bot backend (for validation).
 */

/**
 * XP required to reach each level (cumulative thresholds).
 * Index 0 = Level 1 (starting), Index 9 = Level 10.
 * Matches bot formula: each level N requires N*200 XP to advance.
 * Cumulative: Level 2 = 200, Level 3 = 200+400 = 600, Level 4 = 600+600 = 1200, etc.
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

/**
 * Rank titles corresponding to user levels 1-10.
 * Matches bot/services/scoring.py get_rank_title().
 * Used for display in profile, leaderboard, and level-up animations.
 */
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
 * Matches bot/services/scoring.py get_rank_title() (10 ranks defined).
 */
export const MAX_LEVEL = 10;

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
