/**
 * String literal union types for database enum-like values.
 *
 * Source of truth: packages/shared/src/enums.ts
 * This is a build-time copy for Railway deployment (root_dir isolation).
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

/** lead_registry.lead_source */
export type LeadSource = 'support_analysis' | 'manual' | 'import';

/** generated_scenarios.source_type */
export type ScenarioSourceType = 'hybrid' | 'casebook' | 'generated';

/** generated_scenarios.difficulty (1 = Easy, 2 = Medium, 3 = Hard) */
export type Difficulty = 1 | 2 | 3;
