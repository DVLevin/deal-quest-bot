/**
 * String literal union types for database enum-like values.
 *
 * These correspond to the constrained string columns in the InsForge tables.
 * Using string literal unions (not TypeScript enums) for better tree-shaking
 * and simpler JSON serialization.
 */

/** track_progress.status */
export type TrackStatus = 'locked' | 'unlocked' | 'completed';

/** attempts.mode */
export type AttemptMode = 'learn' | 'train';

/** lead_registry.status */
export type LeadStatus =
  | 'analyzed'
  | 'reached_out'
  | 'meeting_booked'
  | 'in_progress'
  | 'closed_won'
  | 'closed_lost';

/** lead_activity_log.activity_type */
export type LeadActivityType =
  | 'context_update'
  | 'screenshot_comment'
  | 'ai_advice'
  | 'followup_sent'
  | 'status_change';

/** users.provider */
export type LLMProvider = 'openrouter' | 'anthropic';

/** lead_registry.input_type */
export type InputType = 'text' | 'photo' | 'screenshot';

/** generated_scenarios.source_type */
export type ScenarioSourceType = 'hybrid' | 'casebook' | 'generated';

/** generated_scenarios.difficulty (1 = Easy, 2 = Medium, 3 = Hard) */
export type Difficulty = 1 | 2 | 3;
