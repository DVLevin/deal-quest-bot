/**
 * Mutation hooks for assigning and unassigning team members to/from leads.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import { useAuthStore } from '@/features/auth/store';

interface AssignVars {
  leadId: number;
  telegramId: number;
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.telegramId);

  return useMutation({
    mutationFn: async ({ leadId, telegramId }: AssignVars) => {
      const { error } = await getInsforge()
        .database.from('lead_assignments')
        .insert({
          lead_id: leadId,
          telegram_id: telegramId,
          assigned_by: currentUser!,
        });

      if (error) throw error;
    },
    onSettled: (_data, _err, { leadId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.leadAssignments(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.allLeads,
      });
    },
  });
}

export function useUnassignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, telegramId }: AssignVars) => {
      const { error } = await getInsforge()
        .database.from('lead_assignments')
        .delete()
        .eq('lead_id', leadId)
        .eq('telegram_id', telegramId);

      if (error) throw error;
    },
    onSettled: (_data, _err, { leadId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.leadAssignments(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.allLeads,
      });
    },
  });
}
