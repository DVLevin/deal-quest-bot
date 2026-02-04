/**
 * Lead types, defensive parsers, and status configuration.
 *
 * IMPORTANT: lead_registry stores prospect_analysis, closing_strategy,
 * engagement_tactics, and draft_response as TEXT columns containing JSON
 * strings. They arrive as raw strings from PostgREST and must be
 * JSON.parsed manually with try/catch.
 *
 * engagement_plan is JSONB and comes pre-parsed from PostgREST.
 */

import type { LeadStatus } from '@/types/enums';
import type { EngagementPlanStep } from '@/types/tables';
import type { SupportAnalysis } from '@/features/support/types';

// ---------------------------------------------------------------------------
// Status configuration (matches bot/handlers/leads.py STATUS_LABELS exactly)
// ---------------------------------------------------------------------------

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'error' | 'brand'; order: number }
> = {
  analyzed: { label: 'Analyzed', variant: 'info', order: 0 },
  reached_out: { label: 'Reached Out', variant: 'brand', order: 1 },
  meeting_booked: { label: 'Meeting Booked', variant: 'warning', order: 2 },
  in_progress: { label: 'In Progress', variant: 'default', order: 3 },
  closed_won: { label: 'Closed Won', variant: 'success', order: 4 },
  closed_lost: { label: 'Closed Lost', variant: 'error', order: 5 },
};

// ---------------------------------------------------------------------------
// Defensive parser helpers
// ---------------------------------------------------------------------------

function parseStringField(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

// ---------------------------------------------------------------------------
// Prospect analysis parser (TEXT column -> SupportAnalysis)
// ---------------------------------------------------------------------------

const DEFAULT_ANALYSIS: SupportAnalysis = {
  prospect_type: 'Unknown',
  seniority: 'Unknown',
  background_leverage: '',
  company_context: '',
  stage: 'Unknown',
  key_concern: '',
  buying_signal: 'Unknown',
  buying_signal_reason: '',
};

/**
 * Parse prospect_analysis TEXT field into SupportAnalysis.
 *
 * Handles null, empty string, '{}', 'null', and malformed JSON.
 * Uses typeof guards on every property (same pattern as parseOutputJson).
 */
export function parseLeadAnalysis(raw: string | null): SupportAnalysis {
  if (!raw || raw.trim() === '' || raw === '{}' || raw === 'null') {
    return { ...DEFAULT_ANALYSIS };
  }
  try {
    const obj = raw.trim().startsWith('{') ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== 'object') return { ...DEFAULT_ANALYSIS };
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
  } catch {
    return { ...DEFAULT_ANALYSIS, prospect_type: raw.slice(0, 100) };
  }
}

// ---------------------------------------------------------------------------
// Plain text field parsers (TEXT columns, not structured JSON)
// ---------------------------------------------------------------------------

/**
 * Parse closing_strategy TEXT field. Stored as plain text, not structured JSON.
 */
export function parseLeadStrategy(raw: string | null): string {
  if (!raw || raw.trim() === '' || raw === 'null') return '';
  return raw;
}

/**
 * Parse engagement_tactics TEXT field. Stored as plain text, not structured JSON.
 */
export function parseLeadTactics(raw: string | null): string {
  if (!raw || raw.trim() === '' || raw === 'null') return '';
  return raw;
}

/**
 * Parse draft_response TEXT field. Stored as plain text, not structured JSON.
 */
export function parseLeadDraft(raw: string | null): string {
  if (!raw || raw.trim() === '' || raw === 'null') return '';
  return raw;
}

// ---------------------------------------------------------------------------
// Engagement plan parser (JSONB column, comes pre-parsed)
// ---------------------------------------------------------------------------

/**
 * Parse engagement_plan JSONB field into EngagementPlanStep[].
 *
 * Since it's JSONB, PostgREST returns it pre-parsed. But we still validate
 * each item has the expected fields with typeof guards.
 */
export function parseEngagementPlan(plan: unknown): EngagementPlanStep[] {
  if (!Array.isArray(plan)) return [];
  return plan
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      step_id: typeof item.step_id === 'number' ? item.step_id : 0,
      description: parseStringField(item.description, ''),
      timing: parseStringField(item.timing, ''),
      status:
        item.status === 'done' ? ('done' as const) : ('pending' as const),
      suggested_text:
        typeof item.suggested_text === 'string'
          ? item.suggested_text
          : undefined,
      completed_at:
        typeof item.completed_at === 'string' ? item.completed_at : null,
    }));
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Format ISO date string to a readable short date.
 * Returns empty string for null/invalid dates.
 */
export function formatLeadDate(isoString: string | null): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}
