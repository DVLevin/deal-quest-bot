/**
 * TypeScript interfaces mirroring the ACTUAL InsForge database schemas.
 *
 * IMPORTANT: These are derived from the live InsForge table schemas
 * (via get-table-schema MCP tool), NOT from the Python Pydantic models.
 * The Python models include transient fields (e.g., AttemptModel.username)
 * that do not exist as database columns.
 *
 * Convention:
 * - Suffix: `Row` indicates a database row type
 * - `id` fields: number (auto-increment integer)
 * - `telegram_id` fields: number (BIGINT maps to JS number for values < 2^53)
 * - Date fields: string (ISO 8601 from PostgREST)
 * - JSONB fields: typed where structure is known, Record<string, unknown> otherwise
 */

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export interface UserRow {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  provider: string;
  encrypted_api_key: string | null;
  openrouter_model: string;
  total_xp: number;
  current_level: number;
  streak_days: number;
  last_active_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// attempts
// ---------------------------------------------------------------------------
/**
 * NOTE: The Python AttemptModel includes `username` and `user_response`
 * fields, but these do NOT exist as columns in the InsForge `attempts` table.
 * They are transient fields used only in-memory by the bot.
 */
export interface AttemptRow {
  id: number;
  user_id: number | null;
  telegram_id: number;
  scenario_id: string;
  mode: string;
  score: number;
  feedback_json: Record<string, unknown>;
  xp_earned: number;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// track_progress
// ---------------------------------------------------------------------------
export interface TrackProgressRow {
  id: number;
  user_id: number | null;
  telegram_id: number;
  track_id: string;
  level_id: string;
  status: string;
  best_score: number;
  attempts_count: number;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// support_sessions
// ---------------------------------------------------------------------------
export interface SupportSessionRow {
  id: number;
  user_id: number | null;
  telegram_id: number;
  input_text: string | null;
  output_json: Record<string, unknown>;
  provider_used: string | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// scenarios_seen
// ---------------------------------------------------------------------------
export interface ScenarioSeenRow {
  id: number;
  user_id: number | null;
  telegram_id: number;
  scenario_id: string;
  seen_at: string | null;
}

// ---------------------------------------------------------------------------
// lead_registry
// ---------------------------------------------------------------------------
export interface EngagementPlanStep {
  step: string;
  action: string;
  timing?: string;
  [key: string]: unknown;
}

export interface LeadRegistryRow {
  id: number;
  user_id: number | null;
  telegram_id: number;
  prospect_name: string | null;
  prospect_first_name: string | null;
  prospect_last_name: string | null;
  prospect_title: string | null;
  prospect_company: string | null;
  prospect_geography: string | null;
  photo_url: string | null;
  photo_key: string | null;
  prospect_analysis: string | null;
  closing_strategy: string | null;
  engagement_tactics: string | null;
  draft_response: string | null;
  status: string;
  notes: string | null;
  input_type: string;
  original_context: string | null;
  web_research: string | null;
  engagement_plan: EngagementPlanStep[] | null;
  last_contacted: string | null;
  next_followup: string | null;
  followup_count: number;
  created_at: string | null;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// lead_activity_log
// ---------------------------------------------------------------------------
export interface LeadActivityRow {
  id: number;
  lead_id: number;
  telegram_id: number;
  activity_type: string;
  content: string;
  ai_response: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// lead_analysis_history
// ---------------------------------------------------------------------------
export interface LeadAnalysisHistoryRow {
  id: number;
  lead_id: number;
  telegram_id: number;
  version_number: number;
  analysis_snapshot: Record<string, unknown>;
  changes_summary: string | null;
  field_diff: Record<string, unknown> | null;
  triggered_by: string;
  triggering_activity_id: number | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// casebook
// ---------------------------------------------------------------------------
export interface CasebookRow {
  id: number;
  persona_type: string;
  scenario_type: string;
  industry: string | null;
  seniority: string | null;
  prospect_analysis: string | null;
  closing_strategy: string | null;
  engagement_tactics: string | null;
  draft_response: string | null;
  playbook_references: string | null;
  quality_score: number;
  user_accepted_first_draft: boolean;
  user_feedback: string | null;
  created_from_user: number | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// user_memory
// ---------------------------------------------------------------------------
export interface UserMemoryRow {
  id: number;
  user_id: number | null;
  telegram_id: number;
  memory_data: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// generated_scenarios
// ---------------------------------------------------------------------------
/**
 * NOTE: The `generated_scenarios` table returned an empty schema from
 * InsForge's get-table-schema. It may not exist yet or may need to be
 * created. This interface is based on the Python GeneratedScenarioModel
 * and should be validated once the table is created/populated.
 */
export interface ScenarioPersona {
  name: string;
  role: string;
  company?: string;
  personality?: string;
  [key: string]: unknown;
}

export interface ScoringRubric {
  criteria: string;
  weight: number;
  [key: string]: unknown;
}

export interface GeneratedScenarioRow {
  id: number;
  scenario_id: string;
  category: string;
  difficulty: number;
  persona: ScenarioPersona;
  situation: string;
  scoring_focus: string[];
  ideal_response: string;
  scoring_rubric: Record<string, unknown>;
  source_type: string;
  source_casebook_ids: number[];
  times_used: number;
  avg_score: number;
  created_at: string | null;
}
