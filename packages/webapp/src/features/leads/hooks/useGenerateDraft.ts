/**
 * Mutation hook for AI-powered draft generation from screenshots.
 *
 * Uses the DB message bus pattern:
 * 1. TMA inserts a row into draft_requests table
 * 2. Bot poller picks it up, processes via CommentGeneratorAgent
 * 3. TMA polls until status is 'completed' or 'failed'
 * 4. Returns structured options (short/medium/detailed)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

export interface DraftOption {
  label: string;
  length: string;
  text: string;
}

export interface DraftResult {
  platform: string;
  content_type: string;
  options: DraftOption[];
}

interface GenerateDraftVars {
  proofUrl: string;
  leadId: number;
  stepId: number;
  telegramId: number;
  leadName?: string;
  leadTitle?: string;
  leadCompany?: string;
  leadStatus?: string;
  webResearch?: string | null;
  userInstructions?: string;
}

const POLL_INTERVAL = 3000; // 3 seconds
const POLL_TIMEOUT = 180_000; // 3 minutes
const NOT_PICKED_UP_THRESHOLD = 30_000; // 30 seconds — if still 'pending', bot likely not running

async function pollForCompletion(requestId: number, signal?: AbortSignal): Promise<DraftResult> {
  const start = Date.now();
  let wasPickedUp = false;

  while (Date.now() - start < POLL_TIMEOUT) {
    if (signal?.aborted) throw new Error('Draft generation cancelled');

    const { data, error } = await getInsforge()
      .database.from('draft_requests')
      .select('status, result')
      .eq('id', requestId)
      .single();

    if (error) throw new Error(`Poll error: ${error.message}`);

    const status = data?.status;

    if (status === 'completed' && data.result) {
      return data.result as DraftResult;
    }

    if (status === 'failed') {
      const errorMsg = (data.result as { error?: string })?.error || 'Draft generation failed';
      throw new Error(errorMsg);
    }

    if (status === 'processing') {
      wasPickedUp = true;
    }

    if (status === 'pending' && !wasPickedUp && Date.now() - start > NOT_PICKED_UP_THRESHOLD) {
      throw new Error(
        'The bot hasn\'t picked up this request yet. Please make sure the bot is running and try again.'
      );
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, POLL_INTERVAL);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Draft generation cancelled'));
      }, { once: true });
    });
  }

  throw new Error(
    wasPickedUp
      ? 'Draft generation is taking longer than expected. The bot is still working — check back in a moment.'
      : 'Draft generation timed out. The bot may not be running or is overloaded. Please try again.'
  );
}

export function useGenerateDraft() {
  const queryClient = useQueryClient();
  const abortControllerRef = { current: null as AbortController | null };

  return useMutation({
    mutationFn: async ({
      proofUrl,
      leadId,
      stepId,
      telegramId,
      leadName,
      leadTitle,
      leadCompany,
      leadStatus,
      webResearch,
      userInstructions,
    }: GenerateDraftVars): Promise<DraftResult> => {
      // Abort any previous in-flight polling
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const { data, error } = await getInsforge()
        .database.from('draft_requests')
        .insert({
          lead_id: leadId,
          step_id: stepId,
          telegram_id: telegramId,
          proof_url: proofUrl,
          lead_context: {
            name: leadName || null,
            title: leadTitle || null,
            company: leadCompany || null,
            status: leadStatus || null,
            web_research: webResearch || null,
          },
          status: 'pending',
          user_instructions: userInstructions || null,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create draft request: ${error.message}`);
      if (!data?.id) throw new Error('No request ID returned');

      return pollForCompletion(data.id, controller.signal);
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(vars.leadId),
      });
    },
  });
}
