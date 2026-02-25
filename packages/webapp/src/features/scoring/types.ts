/**
 * Scoring / feedback types and safe parser.
 *
 * The bot stores LLM-generated scoring results as JSONB in
 * AttemptRow.feedback_json. Since LLM output is non-deterministic,
 * every field MUST be parsed defensively with typeof checks and
 * fallback defaults. NEVER trust raw feedback_json.
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface ScoreBreakdownItem {
  criterion: string;
  score: number;
  max: number;
  feedback: string;
  user_quote?: string | null;
  suggestion?: string | null;
}

export interface PatternObservation {
  recurring_issue?: string;
  improving_area?: string;
  suggestion?: string;
}

export interface IdealComparison {
  what_ideal_did_differently?: string[];
}

export interface FeedbackData {
  total_score: number;
  xp_earned: number;
  breakdown?: ScoreBreakdownItem[];
  strengths?: string[];
  improvements?: string[];
  pattern_observation?: PatternObservation;
  ideal_response_comparison?: IdealComparison;
}

// ---------------------------------------------------------------------------
// Safe parser
// ---------------------------------------------------------------------------

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function parseBreakdown(value: unknown): ScoreBreakdownItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      criterion: typeof item.criterion === 'string' ? item.criterion : 'Unknown',
      score: typeof item.score === 'number' ? item.score : 0,
      max: typeof item.max === 'number' ? item.max : 10,
      feedback: typeof item.feedback === 'string' ? item.feedback : '',
      user_quote:
        typeof item.user_quote === 'string' ? item.user_quote : null,
      suggestion:
        typeof item.suggestion === 'string' ? item.suggestion : null,
    }));
}

function parsePatternObservation(
  value: unknown,
): PatternObservation | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const obj = value as Record<string, unknown>;
  return {
    recurring_issue:
      typeof obj.recurring_issue === 'string'
        ? obj.recurring_issue
        : undefined,
    improving_area:
      typeof obj.improving_area === 'string'
        ? obj.improving_area
        : undefined,
    suggestion:
      typeof obj.suggestion === 'string' ? obj.suggestion : undefined,
  };
}

function parseIdealComparison(value: unknown): IdealComparison | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const obj = value as Record<string, unknown>;
  return {
    what_ideal_did_differently: parseStringArray(
      obj.what_ideal_did_differently,
    ),
  };
}

/**
 * Safely parse feedback_json from an AttemptRow.
 *
 * Every field is validated with typeof / Array.isArray checks.
 * Returns safe defaults for malformed or empty input so the UI
 * never crashes on unexpected LLM output.
 */
export function parseFeedback(json: Record<string, unknown>): FeedbackData {
  return {
    total_score:
      typeof json.total_score === 'number' ? json.total_score : 0,
    xp_earned: typeof json.xp_earned === 'number' ? json.xp_earned : 0,
    breakdown: parseBreakdown(json.breakdown),
    strengths: parseStringArray(json.strengths),
    improvements: parseStringArray(json.improvements),
    pattern_observation: parsePatternObservation(json.pattern_observation),
    ideal_response_comparison: parseIdealComparison(
      json.ideal_response_comparison,
    ),
  };
}
