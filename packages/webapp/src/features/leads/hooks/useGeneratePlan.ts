/**
 * Mutation hook for TMA-initiated engagement plan generation.
 *
 * Fire-and-forget: inserts a plan_requests row and returns immediately.
 * The bot poller picks it up, generates the plan, and sends a Telegram
 * notification when done. The lead detail page will show the plan on
 * next visit via react-query refetch.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

interface GeneratePlanVars {
  leadId: number;
  telegramId: number;
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, telegramId }: GeneratePlanVars): Promise<void> => {
      const { error } = await getInsforge()
        .database.from('plan_requests')
        .insert({
          lead_id: leadId,
          telegram_id: telegramId,
          status: 'pending',
        });

      if (error) throw new Error(`Failed to create plan request: ${error.message}`);
    },
    onSuccess: (_data, vars) => {
      // Invalidate after a delay so the plan shows up when it's ready
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.leads.detail(vars.leadId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.leads.reminders(vars.telegramId),
        });
      }, 10_000);
    },
  });
}
