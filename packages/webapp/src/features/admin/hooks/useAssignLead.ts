/**
 * Mutation hooks for assigning and unassigning team members to/from leads.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import { emitTmaEvent } from '@/lib/tmaEvents';
import { useAuthStore } from '@/features/auth/store';

interface AssignVars {
  leadId: number;
  telegramId: number;
  /** Display name of the member being assigned (for event payload) */
  memberName?: string;
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
    onSettled: (_data, _err, { leadId, memberName }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.leadAssignments(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.allLeads,
      });

      // Emit TMA event for bot-side confirmation (fire-and-forget)
      if (!_err && currentUser) {
        emitTmaEvent(currentUser, 'lead_assigned', leadId, {
          member_name: memberName ?? 'team member',
        }).catch(() => {});
      }
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
