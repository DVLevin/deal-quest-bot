/**
 * Hook for aggregating today's actions across all leads.
 *
 * Two data sources (merged, deduplicated):
 * 1. scheduled_reminders — overdue or due-today rows (bot-created)
 * 2. lead_registry.engagement_plan — pending steps whose delay_days has passed
 *    since the plan was created (covers leads without scheduled reminders)
 *
 * Used by the Dashboard TodayActionsCard widget.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';

export interface TodayAction {
  id: number | string;
  lead_id: number;
  step_id: number;
  due_at: string | null;
  draft_text: string | null;
  leadName: string;
  stepDescription: string;
  isOverdue: boolean;
  isDueToday: boolean;
}

interface PlanStep {
  step_id?: number;
  status?: string;
  description?: string;
  suggested_text?: string;
  delay_days?: number;
}

interface LeadRow {
  id: number;
  prospect_name: string | null;
  prospect_first_name: string | null;
  prospect_last_name: string | null;
  engagement_plan: PlanStep[] | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
}

function getLeadName(lead: LeadRow): string {
  if (lead.prospect_first_name && lead.prospect_last_name) {
    return `${lead.prospect_first_name} ${lead.prospect_last_name}`;
  }
  return lead.prospect_name || 'Unknown';
}

export function useTodayActions() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.leads.todayActions(telegramId!),
    queryFn: async (): Promise<TodayAction[]> => {
      // --- Source 1: Scheduled reminders (overdue + due today) ---
      const { data: reminders, error: remindersError } = await getInsforge()
        .database.from('scheduled_reminders')
        .select('id, lead_id, step_id, due_at, draft_text')
        .eq('telegram_id', telegramId!)
        .in('status', ['pending', 'sent'])
        .order('due_at', { ascending: true })
        .limit(50);

      if (remindersError) throw remindersError;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Track which lead+step combos we already have from reminders
      const reminderKeys = new Set<string>();
      const reminderActions: TodayAction[] = [];

      if (reminders && reminders.length > 0) {
        const leadIds = [...new Set(reminders.map((r: { lead_id: number }) => r.lead_id))];
        const { data: reminderLeads } = await getInsforge()
          .database.from('lead_registry')
          .select('id, prospect_name, prospect_first_name, prospect_last_name, engagement_plan')
          .in('id', leadIds);

        for (const r of reminders as { id: number; lead_id: number; step_id: number; due_at: string; draft_text: string | null }[]) {
          const lead = reminderLeads?.find((l: { id: number }) => l.id === r.lead_id);
          const dueDate = new Date(r.due_at);
          const isOverdue = dueDate < now;
          const isDueToday = dueDate >= todayStart && dueDate < todayEnd;

          if (!isOverdue && !isDueToday) continue;

          let stepDescription = `Step ${r.step_id}`;
          if (lead?.engagement_plan && Array.isArray(lead.engagement_plan)) {
            const step = lead.engagement_plan.find((s: PlanStep) => s.step_id === r.step_id);
            if (step?.description) stepDescription = step.description;
          }

          const leadName = lead
            ? getLeadName(lead as LeadRow)
            : 'Unknown';

          reminderKeys.add(`${r.lead_id}:${r.step_id}`);
          reminderActions.push({
            id: r.id,
            lead_id: r.lead_id,
            step_id: r.step_id,
            due_at: r.due_at,
            draft_text: r.draft_text,
            leadName,
            stepDescription,
            isOverdue,
            isDueToday,
          });
        }
      }

      // --- Source 2: Pending engagement plan steps from leads ---
      // Fetch leads that are not closed and have an engagement_plan
      const { data: leads, error: leadsError } = await getInsforge()
        .database.from('lead_registry')
        .select('id, prospect_name, prospect_first_name, prospect_last_name, engagement_plan, status, updated_at, created_at')
        .eq('telegram_id', telegramId!)
        .not('engagement_plan', 'is', null)
        .not('status', 'in', '("closed_won","closed_lost")')
        .limit(50);

      if (leadsError) throw leadsError;

      const planActions: TodayAction[] = [];

      if (leads) {
        for (const lead of leads as LeadRow[]) {
          if (!lead.engagement_plan || !Array.isArray(lead.engagement_plan)) continue;

          // Use updated_at as proxy for when the plan was created/last modified
          const planBaseDate = new Date(lead.updated_at || lead.created_at || now.toISOString());
          const daysSincePlan = Math.floor((now.getTime() - planBaseDate.getTime()) / (1000 * 60 * 60 * 24));

          for (const step of lead.engagement_plan) {
            const stepId = step.step_id ?? 0;
            const key = `${lead.id}:${stepId}`;

            // Skip if already covered by a scheduled reminder
            if (reminderKeys.has(key)) continue;

            // Only show pending steps (not done/skipped)
            if (step.status && step.status !== 'pending') continue;

            // Show step if its delay_days has passed (it's actionable now)
            const delayDays = step.delay_days ?? 0;
            if (daysSincePlan < delayDays) continue;

            const isOverdue = daysSincePlan > delayDays;

            planActions.push({
              id: `plan-${lead.id}-${stepId}`,
              lead_id: lead.id,
              step_id: stepId,
              due_at: null,
              draft_text: step.suggested_text || null,
              leadName: getLeadName(lead),
              stepDescription: step.description || `Step ${stepId}`,
              isOverdue,
              isDueToday: !isOverdue,
            });
          }
        }
      }

      // Merge: reminders first (they have exact timing), then plan-based actions
      const all = [...reminderActions, ...planActions];

      // Sort: overdue first, then by lead name
      all.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.leadName.localeCompare(b.leadName);
      });

      return all;
    },
    enabled: !!telegramId,
    refetchInterval: 60000,
  });
}
