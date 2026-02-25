/**
 * Mutation hook for adding/updating notes on a lead.
 *
 * Performs two operations:
 * 1. Updates lead_registry.notes and updated_at
 * 2. Inserts a lead_activity_log entry with activity_type='context_update'
 *
 * No optimistic update -- the form shows a loading state instead.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

interface AddNoteVars {
  leadId: number;
  telegramId: number;
  note: string;
}

export function useAddLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, telegramId, note }: AddNoteVars) => {
      // 1. Update the notes field on the lead
      const { error: updateError } = await getInsforge()
        .database.from('lead_registry')
        .update({
          notes: note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // 2. Create activity log entry
      const { error: activityError } = await getInsforge()
        .database.from('lead_activity_log')
        .insert({
          lead_id: leadId,
          telegram_id: telegramId,
          activity_type: 'context_update',
          content: note,
        });

      if (activityError) throw activityError;
    },
    onSettled: (_data, _err, { leadId, telegramId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.activities(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.byUser(telegramId),
      });
    },
  });
}
