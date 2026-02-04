/**
 * First TMA mutation hook: update lead status with optimistic cache update.
 *
 * On status change:
 * 1. Updates lead_registry.status and updated_at
 * 2. Inserts a lead_activity_log entry with activity_type='status_change'
 *
 * Uses onMutate for optimistic UI, onError for rollback, onSettled for
 * cache invalidation to get true server state.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { LeadStatus } from '@/types/enums';
import type { LeadListItem } from './useLeads';

interface UpdateStatusVars {
  leadId: number;
  newStatus: LeadStatus;
  oldStatus: string;
  telegramId: number;
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, newStatus, oldStatus, telegramId }: UpdateStatusVars) => {
      // 1. Update lead_registry status
      const { error: updateError } = await getInsforge()
        .database.from('lead_registry')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 2. Insert activity log entry for the status change
      const { error: activityError } = await getInsforge()
        .database.from('lead_activity_log')
        .insert([
          {
            lead_id: leadId,
            telegram_id: telegramId,
            activity_type: 'status_change',
            content: `Status changed from ${oldStatus} to ${newStatus}`,
          },
        ]);

      if (activityError) throw activityError;
    },
    onMutate: async ({ leadId, newStatus, telegramId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.leads.byUser(telegramId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });

      // Snapshot previous lead list for rollback
      const previousLeads = queryClient.getQueryData<LeadListItem[]>(
        queryKeys.leads.byUser(telegramId),
      );

      // Optimistically update the lead's status in cache
      if (previousLeads) {
        queryClient.setQueryData(
          queryKeys.leads.byUser(telegramId),
          previousLeads.map((lead) =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead,
          ),
        );
      }

      return { previousLeads };
    },
    onError: (_err, { telegramId }, context) => {
      // Roll back on error
      if (context?.previousLeads) {
        queryClient.setQueryData(
          queryKeys.leads.byUser(telegramId),
          context.previousLeads,
        );
      }
    },
    onSettled: (_data, _err, { telegramId, leadId }) => {
      // Refetch to get true server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.byUser(telegramId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.activities(leadId),
      });
    },
  });
}
