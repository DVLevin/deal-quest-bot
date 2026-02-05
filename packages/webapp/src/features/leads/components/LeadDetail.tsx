/**
 * Full lead detail view with all analysis sections and status management.
 *
 * Reads leadId from URL params. Displays prospect info, status selector,
 * and parsed analysis sections (analysis, strategy, tactics, draft,
 * engagement plan, web research, notes).
 *
 * Uses defensive parsers for TEXT JSON fields and copy-to-clipboard
 * for draft response.
 */

import { useState, useCallback, type ComponentType } from 'react';
import { useParams, Navigate } from 'react-router';
import {
  Target,
  FileText,
  ListChecks,
  Globe,
  StickyNote,
  History,
  User,
  Copy,
  Check,
  Circle,
  SkipForward,
} from 'lucide-react';
import { Card, Badge, Skeleton, ErrorCard } from '@/shared/ui';
import { useToast } from '@/shared/stores/toastStore';
import { useAuthStore } from '@/features/auth/store';
import { StrategyDisplay } from '@/features/support/components/StrategyDisplay';
import { TacticsDisplay } from '@/features/support/components/TacticsDisplay';
import { useLead } from '../hooks/useLead';
import { useUpdateLeadStatus } from '../hooks/useUpdateLeadStatus';
import { useUpdatePlanStep } from '../hooks/useUpdatePlanStep';
import { LeadStatusSelector } from './LeadStatusSelector';
import { LeadNotes } from './LeadNotes';
import { ActivityTimeline } from './ActivityTimeline';
import {
  parseLeadAnalysis,
  parseLeadStrategy,
  parseLeadTactics,
  parseLeadDraft,
  parseEngagementPlan,
  LEAD_STATUS_CONFIG,
  formatLeadDate,
} from '../types';
import type { LeadStatus } from '@/types/enums';
import type { PlanStepStatus } from '@/types/tables';
import type { SupportAnalysis } from '@/features/support/types';

// ---------------------------------------------------------------------------
// Clipboard helper (same as DraftDisplay pattern)
// ---------------------------------------------------------------------------

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

// ---------------------------------------------------------------------------
// Reusable Section component
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="sm">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Analysis section (structured display)
// ---------------------------------------------------------------------------

function AnalysisSection({ analysis }: { analysis: SupportAnalysis }) {
  return (
    <Section icon={Target} title="Prospect Analysis">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand" size="sm">
            {analysis.prospect_type}
          </Badge>
          <Badge variant="info" size="sm">
            {analysis.seniority}
          </Badge>
          {analysis.stage !== 'Unknown' && (
            <Badge variant="default" size="sm">
              {analysis.stage}
            </Badge>
          )}
        </div>

        {analysis.buying_signal !== 'Unknown' && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Buying Signal</span>
            <Badge
              variant={
                analysis.buying_signal.toLowerCase() === 'high' ||
                analysis.buying_signal.toLowerCase() === 'strong'
                  ? 'success'
                  : analysis.buying_signal.toLowerCase() === 'medium' ||
                      analysis.buying_signal.toLowerCase() === 'moderate'
                    ? 'warning'
                    : 'error'
              }
              size="sm"
            >
              {analysis.buying_signal}
            </Badge>
          </div>
        )}

        {analysis.buying_signal_reason && (
          <p className="text-xs text-text-hint">
            {analysis.buying_signal_reason}
          </p>
        )}

        {analysis.key_concern && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-2">
            <p className="text-xs font-medium text-warning">Key Concern</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {analysis.key_concern}
            </p>
          </div>
        )}

        {analysis.background_leverage && (
          <div>
            <p className="text-xs font-medium text-text-secondary">
              Background Leverage
            </p>
            <p className="mt-0.5 text-xs text-text">
              {analysis.background_leverage}
            </p>
          </div>
        )}

        {analysis.company_context && (
          <div>
            <p className="text-xs font-medium text-text-secondary">
              Company Context
            </p>
            <p className="mt-0.5 text-xs text-text">
              {analysis.company_context}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// LeadDetail component
// ---------------------------------------------------------------------------

export function LeadDetail() {
  const { leadId: leadIdParam } = useParams<{ leadId: string }>();
  const numericId = Number(leadIdParam);
  const telegramId = useAuthStore((s) => s.telegramId);

  const { data: lead, isLoading, isError, refetch } = useLead(
    Number.isNaN(numericId) ? 0 : numericId,
  );
  const mutation = useUpdateLeadStatus();
  const stepMutation = useUpdatePlanStep();
  const { toast } = useToast();

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
    [],
  );

  const handleStatusChange = useCallback(
    (newStatus: LeadStatus) => {
      if (!lead || !telegramId) return;
      const vars = {
        leadId: lead.id,
        newStatus,
        oldStatus: lead.status,
        telegramId,
      };
      mutation.mutate(vars, {
        onSuccess: () => {
          toast({ type: 'success', message: 'Status updated' });
        },
        onError: () => {
          toast({
            type: 'error',
            message: 'Failed to update status',
            action: { label: 'Retry', onClick: () => mutation.mutate(vars) },
          });
        },
      });
    },
    [lead, telegramId, mutation, toast],
  );

  const handleStepToggle = useCallback(
    (stepId: number, currentStatus: PlanStepStatus) => {
      if (!lead || !telegramId) return;
      // Cycle: pending -> done -> skipped -> pending
      let newStatus: PlanStepStatus;
      if (currentStatus === 'pending') {
        newStatus = 'done';
      } else if (currentStatus === 'done') {
        newStatus = 'skipped';
      } else {
        newStatus = 'pending';
      }
      stepMutation.mutate(
        { leadId: lead.id, stepId, newStatus, telegramId },
        {
          onSuccess: () => {
            const label =
              newStatus === 'done'
                ? 'Done'
                : newStatus === 'skipped'
                  ? 'Skipped'
                  : 'Pending';
            toast({ type: 'success', message: `Step ${stepId} marked ${label}` });
          },
          onError: () => {
            toast({
              type: 'error',
              message: 'Failed to update step',
              action: {
                label: 'Retry',
                onClick: () => handleStepToggle(stepId, currentStatus),
              },
            });
          },
        },
      );
    },
    [lead, telegramId, stepMutation, toast],
  );

  if (Number.isNaN(numericId)) {
    return <Navigate to="/leads" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height={28} width="60%" />
        <Skeleton height={48} />
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    );
  }

  if (isError) {
    return <ErrorCard message="Unable to load lead details" onRetry={refetch} />;
  }

  if (!lead) {
    return <Navigate to="/leads" replace />;
  }

  const statusConfig = LEAD_STATUS_CONFIG[lead.status as LeadStatus];
  const analysis = parseLeadAnalysis(lead.prospect_analysis);
  const strategy = parseLeadStrategy(lead.closing_strategy);
  const tactics = parseLeadTactics(lead.engagement_tactics);
  const draft = parseLeadDraft(lead.draft_response);
  const engagementPlan = parseEngagementPlan(lead.engagement_plan);

  return (
    <div className="space-y-4">
      {/* Header: photo, name, title, company */}
      <div className="flex items-start gap-3">
        {lead.photo_url ? (
          <img
            src={lead.photo_url}
            alt={lead.prospect_name ?? 'Prospect'}
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <User className="h-8 w-8 text-accent" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-text">
            {lead.prospect_first_name && lead.prospect_last_name
              ? `${lead.prospect_first_name} ${lead.prospect_last_name}`
              : lead.prospect_name ?? 'Unknown Prospect'}
          </h2>
          {(lead.prospect_title || lead.prospect_company) && (
            <p className="text-sm text-text-secondary">
              {[lead.prospect_title, lead.prospect_company]
                .filter(Boolean)
                .join(' @ ')}
            </p>
          )}
          {lead.prospect_geography && (
            <p className="text-xs text-text-hint">
              {lead.prospect_geography}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            {statusConfig && (
              <Badge variant={statusConfig.variant} size="sm">
                {statusConfig.label}
              </Badge>
            )}
            <Badge variant="default" size="sm">
              {lead.input_type}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-text-hint">
            {formatLeadDate(lead.created_at)}
          </p>
        </div>
      </div>

      {/* Status selector */}
      <LeadStatusSelector
        currentStatus={lead.status}
        onStatusChange={handleStatusChange}
        isUpdating={mutation.isPending}
      />

      {/* Analysis section */}
      {analysis.prospect_type !== 'Unknown' && (
        <AnalysisSection analysis={analysis} />
      )}

      {/* Strategy section (reuses Support display component) */}
      {strategy && strategy.steps.length > 0 && (
        <Card padding="sm">
          <StrategyDisplay strategy={strategy} />
        </Card>
      )}

      {/* Tactics section (reuses Support display component) */}
      {tactics && tactics.linkedin_actions.length > 0 && (
        <Card padding="sm">
          <TacticsDisplay tactics={tactics} />
        </Card>
      )}

      {/* Draft response section with copy */}
      {draft && draft.message && (
        <Section icon={FileText} title="Draft Response">
          <div className="flex items-center gap-2 mb-2">
            {draft.platform && (
              <Badge variant="brand" size="sm">{draft.platform}</Badge>
            )}
            {draft.word_count > 0 && (
              <Badge variant="default" size="sm">{draft.word_count} words</Badge>
            )}
          </div>
          <Card padding="sm" className="bg-surface-secondary/30">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text">
              {draft.message}
            </pre>
          </Card>
          <button
            type="button"
            onClick={() => handleCopy(draft.message)}
            className="mt-2 flex min-h-[44px] items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-2 text-xs font-medium text-text-secondary transition-colors active:bg-surface-secondary/70"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy draft
              </>
            )}
          </button>
        </Section>
      )}

      {/* Engagement plan section */}
      {engagementPlan.length > 0 && (
        <Section icon={ListChecks} title="Engagement Plan">
          <div className="space-y-2">
            {engagementPlan.map((step) => (
              <div
                key={step.step_id}
                className="flex items-start gap-3 rounded-lg bg-surface-secondary/30 p-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                  {step.step_id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{step.description}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {step.timing && (
                      <span className="text-xs text-text-hint">
                        {step.timing}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleStepToggle(step.step_id, step.status)}
                  disabled={stepMutation.isPending}
                  className={`flex min-h-[32px] items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors active:scale-95 disabled:opacity-50 ${
                    step.status === 'done'
                      ? 'bg-success/15 text-success'
                      : step.status === 'skipped'
                        ? 'bg-text-hint/15 text-text-hint'
                        : 'bg-surface-secondary text-text-secondary'
                  }`}
                >
                  {step.status === 'done' && <Check className="h-3 w-3" />}
                  {step.status === 'skipped' && <SkipForward className="h-3 w-3" />}
                  {step.status === 'pending' && <Circle className="h-3 w-3" />}
                  {step.status === 'done'
                    ? 'Done'
                    : step.status === 'skipped'
                      ? 'Skipped'
                      : 'Pending'}
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Web research section */}
      {lead.web_research && (
        <Section icon={Globe} title="Web Research">
          <div className="max-h-60 overflow-y-auto">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {lead.web_research}
            </p>
          </div>
        </Section>
      )}

      {/* Notes section */}
      <Section icon={StickyNote} title="Notes">
        <LeadNotes leadId={lead.id} currentNote={lead.notes} />
      </Section>

      {/* Activity timeline */}
      <Card padding="sm">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">Activity</h3>
        </div>
        <ActivityTimeline leadId={lead.id} />
      </Card>
    </div>
  );
}
