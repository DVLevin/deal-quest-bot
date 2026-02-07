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
import type {
  SupportAnalysis,
  SupportStrategy,
  EngagementTactics,
  SupportDraft,
} from '@/features/support/types';

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
// Structured field parsers (TEXT columns containing JSON strings)
// ---------------------------------------------------------------------------

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function parseNumberField(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

/**
 * Parse closing_strategy TEXT field into SupportStrategy.
 *
 * Stored as JSON string: {"steps": [...], "anticipated_objection": "...", ...}
 */
export function parseLeadStrategy(raw: string | null): SupportStrategy | null {
  if (!raw || raw.trim() === '' || raw === 'null') return null;
  try {
    const obj = raw.trim().startsWith('{') ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== 'object') return null;
    const steps = Array.isArray(obj.steps)
      ? obj.steps
          .filter((s: unknown): s is Record<string, unknown> => typeof s === 'object' && s !== null)
          .map((s: Record<string, unknown>) => ({
            principle: parseStringField(s.principle, ''),
            detail: parseStringField(s.detail, ''),
          }))
      : [];
    return {
      steps,
      anticipated_objection: parseStringField(obj.anticipated_objection, ''),
      objection_response: parseStringField(obj.objection_response, ''),
    };
  } catch {
    return null;
  }
}

/**
 * Parse engagement_tactics TEXT field into EngagementTactics.
 *
 * Stored as JSON string: {"linkedin_actions": [...], "comment_suggestion": "...", ...}
 */
export function parseLeadTactics(raw: string | null): EngagementTactics | null {
  if (!raw || raw.trim() === '' || raw === 'null') return null;
  try {
    const obj = raw.trim().startsWith('{') ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== 'object') return null;
    return {
      linkedin_actions: parseStringArray(obj.linkedin_actions),
      comment_suggestion: parseStringField(obj.comment_suggestion, ''),
      timing: parseStringField(obj.timing, ''),
    };
  } catch {
    return null;
  }
}

/**
 * Parse draft_response TEXT field into SupportDraft.
 *
 * Stored as JSON string: {"platform": "...", "message": "...", ...}
 */
export function parseLeadDraft(raw: string | null): SupportDraft | null {
  if (!raw || raw.trim() === '' || raw === 'null') return null;
  try {
    const obj = raw.trim().startsWith('{') ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== 'object') return null;
    return {
      platform: parseStringField(obj.platform, ''),
      message: parseStringField(obj.message, ''),
      word_count: parseNumberField(obj.word_count, 0),
      playbook_reference: parseStringField(obj.playbook_reference, ''),
    };
  } catch {
    return null;
  }
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
        item.status === 'done'
          ? ('done' as const)
          : item.status === 'skipped'
            ? ('skipped' as const)
            : ('pending' as const),
      suggested_text:
        typeof item.suggested_text === 'string'
          ? item.suggested_text
          : undefined,
      completed_at:
        typeof item.completed_at === 'string' ? item.completed_at : null,
      proof_url:
        typeof item.proof_url === 'string' ? item.proof_url : undefined,
      cant_perform_reason:
        typeof item.cant_perform_reason === 'string'
          ? item.cant_perform_reason
          : undefined,
      alternative_action:
        typeof item.alternative_action === 'string'
          ? item.alternative_action
          : undefined,
    }));
}

// ---------------------------------------------------------------------------
// Plan progress computation
// ---------------------------------------------------------------------------

export interface PlanProgress {
  /** Total number of steps in the engagement plan */
  total: number;
  /** Number of steps completed (done or skipped) */
  completed: number;
  /** Number of pending steps that are past their due date */
  overdue: number;
  /** Description of the first pending step, or null if none */
  nextAction: string | null;
  /** Number of steps that have a proof screenshot uploaded */
  proofCount: number;
}

/**
 * Compute progress metrics from an engagement plan and its scheduled reminders.
 *
 * @param plan - Engagement plan steps (JSONB from lead_registry)
 * @param remindersDueAt - Map of step_id -> due_at ISO string from scheduled_reminders.
 *   If null, overdue cannot be computed (set to 0).
 */
export function computePlanProgress(
  plan: EngagementPlanStep[] | null,
  remindersDueAt: Map<number, string> | null,
): PlanProgress {
  if (!plan || plan.length === 0) {
    return { total: 0, completed: 0, overdue: 0, nextAction: null, proofCount: 0 };
  }

  const now = new Date();
  let completed = 0;
  let overdue = 0;
  let proofCount = 0;
  let nextAction: string | null = null;

  for (const step of plan) {
    if (step.proof_url) {
      proofCount++;
    }
    if (step.status === 'done' || step.status === 'skipped') {
      completed++;
    } else if (step.status === 'pending') {
      if (!nextAction) {
        nextAction = step.description;
      }
      // Check overdue only if we have reminder data
      if (remindersDueAt) {
        const dueAt = remindersDueAt.get(step.step_id);
        if (dueAt && new Date(dueAt) < now) {
          overdue++;
        }
      }
    }
  }

  return { total: plan.length, completed, overdue, nextAction, proofCount };
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

// ---------------------------------------------------------------------------
// Smart defaults: suggested next status & context-aware note placeholders
// ---------------------------------------------------------------------------

/**
 * Suggest the next logical pipeline status based on current status.
 * Follows the pipeline progression order defined in LEAD_STATUS_CONFIG.
 * Returns null if at the end of the pipeline (closed_won), at a terminal
 * state (closed_lost), or if the status is unknown.
 */
export function suggestNextStatus(currentStatus: string): string | null {
  const STATUS_ORDER = ['analyzed', 'reached_out', 'meeting_booked', 'in_progress', 'closed_won'];
  const idx = STATUS_ORDER.indexOf(currentStatus);
  if (idx >= 0 && idx < STATUS_ORDER.length - 1) {
    return STATUS_ORDER[idx + 1];
  }
  return null;
}

/**
 * Return a context-aware placeholder for the notes textarea based on lead status.
 * Helps users know what kind of note is most useful at each pipeline stage.
 */
export function getNotePlaceholder(status: string): string {
  const PLACEHOLDERS: Record<string, string> = {
    analyzed: 'What do you know about this prospect? Any mutual connections?',
    reached_out: 'How did the outreach go? Did they respond?',
    meeting_booked: 'What topics should you cover? Any prep notes?',
    in_progress: 'How is the deal progressing? Any blockers?',
    closed_won: 'What worked? Any lessons for future deals?',
    closed_lost: 'Why did it fall through? What would you do differently?',
  };
  return PLACEHOLDERS[status] ?? 'Add context, reminders, or follow-up notes...';
}
