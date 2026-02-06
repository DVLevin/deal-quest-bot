/**
 * Hook for aggregating today's actions across all leads.
 *
 * Fetches pending/sent scheduled_reminders for the current user, enriches
 * each with lead name and step description from engagement_plan JSONB,
 * then filters to only overdue or due-today items.
 *
 * Used by the Dashboard TodayActionsCard widget (TMAUX-V20-04).
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';

export interface TodayAction {
  id: number;
  lead_id: number;
  step_id: number;
  due_at: string;
  draft_text: string | null;
  leadName: string;
  stepDescription: string;
  isOverdue: boolean;
  isDueToday: boolean;
}

export function useTodayActions() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.leads.todayActions(telegramId!),
    queryFn: async (): Promise<TodayAction[]> => {
      // Get pending/sent reminders for the user
      const { data: reminders, error: remindersError } = await getInsforge()
        .database.from('scheduled_reminders')
        .select('id, lead_id, step_id, due_at, draft_text')
        .eq('telegram_id', telegramId!)
        .in('status', ['pending', 'sent'])
        .order('due_at', { ascending: true })
        .limit(50);

      if (remindersError) throw remindersError;
      if (!reminders || reminders.length === 0) return [];

      // Get lead names and engagement plans for step descriptions
      const leadIds = [...new Set(reminders.map((r: { lead_id: number }) => r.lead_id))];
      const { data: leads, error: leadsError } = await getInsforge()
        .database.from('lead_registry')
        .select('id, prospect_name, prospect_first_name, prospect_last_name, engagement_plan')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      return reminders
        .map((r: { id: number; lead_id: number; step_id: number; due_at: string; draft_text: string | null }) => {
          const lead = leads?.find(
            (l: { id: number }) => l.id === r.lead_id,
          );
          const dueDate = new Date(r.due_at);
          const isOverdue = dueDate < now;
          const isDueToday = dueDate >= todayStart && dueDate < todayEnd;

          // Get step description from engagement_plan JSONB
          let stepDescription = `Step ${r.step_id}`;
          if (lead?.engagement_plan && Array.isArray(lead.engagement_plan)) {
            const step = lead.engagement_plan.find(
              (s: { step_id?: number }) => s.step_id === r.step_id,
            );
            if (step && typeof step.description === 'string') {
              stepDescription = step.description;
            }
          }

          // Build display name from structured or legacy fields
          let leadName = 'Unknown';
          if (lead?.prospect_first_name && lead?.prospect_last_name) {
            leadName = `${lead.prospect_first_name} ${lead.prospect_last_name}`;
          } else if (lead?.prospect_name) {
            leadName = lead.prospect_name;
          }

          return {
            id: r.id,
            lead_id: r.lead_id,
            step_id: r.step_id,
            due_at: r.due_at,
            draft_text: r.draft_text,
            leadName,
            stepDescription,
            isOverdue,
            isDueToday,
          };
        })
        .filter((a: TodayAction) => a.isOverdue || a.isDueToday);
    },
    enabled: !!telegramId,
    refetchInterval: 60000, // Refresh every minute
  });
}
