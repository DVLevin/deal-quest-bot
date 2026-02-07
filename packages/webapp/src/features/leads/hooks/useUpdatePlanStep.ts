/**
 * Mutation hook for updating engagement plan step status.
 *
 * On step status change:
 * 1. Updates engagement_plan JSONB in lead_registry
 * 2. Updates corresponding scheduled_reminders row (if exists)
 * 3. Inserts a lead_activity_log entry
 *
 * Uses onMutate for optimistic UI, onError for rollback, onSettled for
 * cache invalidation to get true server state.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { PlanStepStatus, EngagementPlanStep } from '@/types/tables';
import type { LeadRegistryRow } from '@/types/tables';

interface UpdatePlanStepVars {
  leadId: number;
  stepId: number;
  newStatus: PlanStepStatus;
  telegramId: number;
  /** URL of uploaded proof screenshot (set when completing a step with proof) */
  proofUrl?: string;
  /** Reason the user can't perform this step (set when skipping) */
  cantPerformReason?: string;
}

/**
 * Map plan step status to scheduled_reminders status.
 * scheduled_reminders uses: pending, sent, completed, skipped, cancelled
 */
function mapToReminderStatus(
  stepStatus: PlanStepStatus,
): 'pending' | 'completed' | 'skipped' {
  switch (stepStatus) {
    case 'done':
      return 'completed';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

export function useUpdatePlanStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      stepId,
      newStatus,
      telegramId,
      proofUrl,
      cantPerformReason,
    }: UpdatePlanStepVars) => {
      // 1. Fetch current lead's engagement_plan
      const { data: leadData, error: fetchError } = await getInsforge()
        .database.from('lead_registry')
        .select('engagement_plan')
        .eq('id', leadId)
        .single();

      if (fetchError) throw fetchError;
      if (!leadData) throw new Error('Lead not found');

      // 2. Update the step in engagement_plan
      const currentPlan = (leadData.engagement_plan ?? []) as EngagementPlanStep[];
      const updatedPlan = currentPlan.map((step) => {
        if (step.step_id === stepId) {
          return {
            ...step,
            status: newStatus,
            completed_at:
              newStatus === 'done' || newStatus === 'skipped'
                ? new Date().toISOString()
                : null,
            ...(proofUrl !== undefined && { proof_url: proofUrl }),
            ...(cantPerformReason !== undefined && { cant_perform_reason: cantPerformReason }),
          };
        }
        return step;
      });

      // 3. Write updated engagement_plan back to lead_registry
      const { error: updateError } = await getInsforge()
        .database.from('lead_registry')
        .update({
          engagement_plan: updatedPlan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 4. Update scheduled_reminders row if it exists
      const reminderStatus = mapToReminderStatus(newStatus);
      const { error: reminderError } = await getInsforge()
        .database.from('scheduled_reminders')
        .update({
          status: reminderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId)
        .eq('step_id', stepId);

      // Ignore reminderError silently - row may not exist
      if (reminderError) {
        console.warn('Failed to update scheduled_reminders:', reminderError);
      }

      // 5. Insert activity log entry
      const activityContent = cantPerformReason
        ? `Step ${stepId} can't perform: ${cantPerformReason}`
        : `Step ${stepId} marked as ${newStatus === 'done' ? 'Done' : newStatus === 'skipped' ? 'Skipped' : 'Pending'}`;
      const { error: activityError } = await getInsforge()
        .database.from('lead_activity_log')
        .insert({
          lead_id: leadId,
          telegram_id: telegramId,
          activity_type:
            newStatus === 'done'
              ? 'step_execution'
              : newStatus === 'skipped'
                ? 'step_skip'
                : 'step_reset',
          content: activityContent,
        });

      if (activityError) throw activityError;

      return { updatedPlan };
    },
    onMutate: async ({ leadId, stepId, newStatus, proofUrl, cantPerformReason }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });

      // Snapshot previous lead data for rollback
      const previousLead = queryClient.getQueryData<LeadRegistryRow>(
        queryKeys.leads.detail(leadId),
      );

      // Optimistically update the step status in cache
      if (previousLead) {
        const currentPlan = (previousLead.engagement_plan ?? []) as EngagementPlanStep[];
        const updatedPlan = currentPlan.map((step) => {
          if (step.step_id === stepId) {
            return {
              ...step,
              status: newStatus,
              completed_at:
                newStatus === 'done' || newStatus === 'skipped'
                  ? new Date().toISOString()
                  : null,
              ...(proofUrl !== undefined && { proof_url: proofUrl }),
              ...(cantPerformReason !== undefined && { cant_perform_reason: cantPerformReason }),
            };
          }
          return step;
        });

        queryClient.setQueryData(queryKeys.leads.detail(leadId), {
          ...previousLead,
          engagement_plan: updatedPlan,
        });
      }

      return { previousLead };
    },
    onError: (_err, { leadId }, context) => {
      // Roll back on error
      if (context?.previousLead) {
        queryClient.setQueryData(
          queryKeys.leads.detail(leadId),
          context.previousLead,
        );
      }
    },
    onSettled: (_data, _err, { telegramId, leadId }) => {
      // Refetch to get true server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.byUser(telegramId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.activities(leadId),
      });
      // Invalidate today's actions so dashboard widget updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.todayActions(telegramId),
      });
      // Invalidate reminders cache (used by LeadCard progress)
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.reminders(telegramId),
      });
    },
  });
}
