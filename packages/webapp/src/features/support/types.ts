/**
 * Support output types and safe parser.
 *
 * The bot stores LLM-generated support analysis as JSONB in
 * SupportSessionRow.output_json. Since LLM output is non-deterministic,
 * every field MUST be parsed defensively with typeof checks and
 * fallback defaults. NEVER trust raw output_json.
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface SupportAnalysis {
  prospect_type: string;
  seniority: string;
  background_leverage: string;
  company_context: string;
  stage: string;
  key_concern: string;
  buying_signal: string;
  buying_signal_reason: string;
}

export interface StrategyStep {
  principle: string;
  detail: string;
}

export interface SupportStrategy {
  steps: StrategyStep[];
  anticipated_objection: string;
  objection_response: string;
}

export interface EngagementTactics {
  linkedin_actions: string[];
  comment_suggestion: string;
  timing: string;
}

export interface SupportDraft {
  platform: string;
  message: string;
  word_count: number;
  playbook_reference: string;
}

export interface SupportOutput {
  analysis: SupportAnalysis;
  strategy: SupportStrategy;
  engagement_tactics: EngagementTactics;
  draft: SupportDraft;
}

// ---------------------------------------------------------------------------
// Safe parser helpers
// ---------------------------------------------------------------------------

function parseStringField(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function parseNumberField(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function parseAnalysis(value: unknown): SupportAnalysis {
  if (typeof value !== 'object' || value === null) {
    return {
      prospect_type: 'Unknown',
      seniority: 'Unknown',
      background_leverage: '',
      company_context: '',
      stage: 'Unknown',
      key_concern: '',
      buying_signal: 'Unknown',
      buying_signal_reason: '',
    };
  }
  const obj = value as Record<string, unknown>;
  return {
    prospect_type: parseStringField(obj.prospect_type, 'Unknown'),
    seniority: parseStringField(obj.seniority, 'Unknown'),
    background_leverage: parseStringField(obj.background_leverage, ''),
    company_context: parseStringField(obj.company_context, ''),
    stage: parseStringField(obj.stage, 'Unknown'),
    key_concern: parseStringField(obj.key_concern, ''),
    buying_signal: parseStringField(obj.buying_signal, 'Unknown'),
    buying_signal_reason: parseStringField(obj.buying_signal_reason, ''),
  };
}

function parseStrategySteps(value: unknown): StrategyStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      principle: parseStringField(item.principle, 'Unknown'),
      detail: parseStringField(item.detail, ''),
    }));
}

function parseStrategy(value: unknown): SupportStrategy {
  if (typeof value !== 'object' || value === null) {
    return {
      steps: [],
      anticipated_objection: '',
      objection_response: '',
    };
  }
  const obj = value as Record<string, unknown>;
  return {
    steps: parseStrategySteps(obj.steps),
    anticipated_objection: parseStringField(obj.anticipated_objection, ''),
    objection_response: parseStringField(obj.objection_response, ''),
  };
}

function parseEngagementTactics(value: unknown): EngagementTactics {
  if (typeof value !== 'object' || value === null) {
    return {
      linkedin_actions: [],
      comment_suggestion: '',
      timing: '',
    };
  }
  const obj = value as Record<string, unknown>;
  return {
    linkedin_actions: parseStringArray(obj.linkedin_actions),
    comment_suggestion: parseStringField(obj.comment_suggestion, ''),
    timing: parseStringField(obj.timing, ''),
  };
}

function parseDraft(value: unknown): SupportDraft {
  if (typeof value !== 'object' || value === null) {
    return {
      platform: 'Unknown',
      message: '',
      word_count: 0,
      playbook_reference: '',
    };
  }
  const obj = value as Record<string, unknown>;
  return {
    platform: parseStringField(obj.platform, 'Unknown'),
    message: parseStringField(obj.message, ''),
    word_count: parseNumberField(obj.word_count, 0),
    playbook_reference: parseStringField(obj.playbook_reference, ''),
  };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Safely parse output_json from a SupportSessionRow.
 *
 * Every field is validated with typeof / Array.isArray checks.
 * Returns safe defaults for malformed or empty input so the UI
 * never crashes on unexpected LLM output.
 */
export function parseOutputJson(json: Record<string, unknown>): SupportOutput {
  return {
    analysis: parseAnalysis(json.analysis),
    strategy: parseStrategy(json.strategy),
    engagement_tactics: parseEngagementTactics(json.engagement_tactics),
    draft: parseDraft(json.draft),
  };
}
