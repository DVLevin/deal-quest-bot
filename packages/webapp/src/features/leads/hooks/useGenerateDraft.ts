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
}

const POLL_INTERVAL = 3000; // 3 seconds
const POLL_TIMEOUT = 90_000; // 90 seconds (vision models can be slow)

async function pollForCompletion(requestId: number): Promise<DraftResult> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT) {
    const { data, error } = await getInsforge()
      .database.from('draft_requests')
      .select('status, result')
      .eq('id', requestId)
      .single();

    if (error) throw new Error(`Poll error: ${error.message}`);

    if (data?.status === 'completed' && data.result) {
      return data.result as DraftResult;
    }

    if (data?.status === 'failed') {
      const errorMsg = (data.result as { error?: string })?.error || 'Draft generation failed';
      throw new Error(errorMsg);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error('Draft generation timed out. Please try again.');
}

export function useGenerateDraft() {
  const queryClient = useQueryClient();

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
    }: GenerateDraftVars): Promise<DraftResult> => {
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
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create draft request: ${error.message}`);
      if (!data?.id) throw new Error('No request ID returned');

      return pollForCompletion(data.id);
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(vars.leadId),
      });
    },
  });
}
