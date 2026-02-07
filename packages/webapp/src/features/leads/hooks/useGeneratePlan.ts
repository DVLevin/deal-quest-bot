/**
 * Mutation hook for TMA-initiated engagement plan generation.
 *
 * Uses the DB message bus pattern:
 * 1. TMA inserts a row into plan_requests table
 * 2. Bot poller picks it up, generates plan via EngagementService
 * 3. TMA polls until status is 'completed' or 'failed'
 * 4. Invalidates lead detail + reminders queries on completion
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

interface GeneratePlanVars {
  leadId: number;
  telegramId: number;
}

interface PlanResult {
  plan: unknown[];
  step_count: number;
}

const POLL_INTERVAL = 3000; // 3 seconds
const POLL_TIMEOUT = 60_000; // 60 seconds (plan gen is faster than vision models)

async function pollForCompletion(requestId: number, signal?: AbortSignal): Promise<PlanResult> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT) {
    if (signal?.aborted) throw new Error('Plan generation cancelled');

    const { data, error } = await getInsforge()
      .database.from('plan_requests')
      .select('status, result')
      .eq('id', requestId)
      .single();

    if (error) throw new Error(`Poll error: ${error.message}`);

    if (data?.status === 'completed' && data.result) {
      return data.result as PlanResult;
    }

    if (data?.status === 'failed') {
      const errorMsg = (data.result as { error?: string })?.error || 'Plan generation failed';
      throw new Error(errorMsg);
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, POLL_INTERVAL);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Plan generation cancelled'));
      }, { once: true });
    });
  }

  throw new Error('Plan generation timed out. Please try again.');
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();
  const abortControllerRef = { current: null as AbortController | null };

  return useMutation({
    mutationFn: async ({ leadId, telegramId }: GeneratePlanVars): Promise<PlanResult> => {
      // Abort any previous in-flight polling
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const { data, error } = await getInsforge()
        .database.from('plan_requests')
        .insert({
          lead_id: leadId,
          telegram_id: telegramId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create plan request: ${error.message}`);
      if (!data?.id) throw new Error('No request ID returned');

      return pollForCompletion(data.id, controller.signal);
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(vars.leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.reminders(vars.telegramId),
      });
    },
  });
}
