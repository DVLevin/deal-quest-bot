/**
 * Mutation hook for AI-powered draft generation from screenshots.
 *
 * Calls the `generate-draft` InsForge Edge Function which:
 * 1. Fetches the proof screenshot from storage URL
 * 2. Sends it to OpenRouter vision API with lead context
 * 3. Returns 2-3 contextual comment options
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { insforgeAnon } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

interface GenerateDraftVars {
  proofUrl: string;
  leadId: number;
  leadName?: string;
  leadTitle?: string;
  leadCompany?: string;
  leadStatus?: string;
  webResearch?: string | null;
}

interface GenerateDraftResult {
  draft: string;
}

export function useGenerateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proofUrl,
      leadName,
      leadTitle,
      leadCompany,
      leadStatus,
      webResearch,
    }: GenerateDraftVars): Promise<string> => {
      const { data, error } = await insforgeAnon.functions.invoke<GenerateDraftResult>(
        'generate-draft',
        {
          body: {
            proofUrl,
            leadName,
            leadTitle,
            leadCompany,
            leadStatus,
            webResearch,
          },
        },
      );

      if (error) throw error;
      if (!data?.draft) throw new Error('No draft returned from AI');

      return data.draft;
    },
    onSettled: (_data, _err, { leadId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });
    },
  });
}
