/**
 * Mutation hook for updating user LLM settings (provider and/or model).
 *
 * Only updates non-undefined fields. Always sets updated_at.
 * Does NOT touch encrypted_api_key (requires bot-side Fernet encryption).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

interface UpdateSettingsVars {
  telegramId: number;
  provider?: string;
  openrouterModel?: string;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ telegramId, provider, openrouterModel }: UpdateSettingsVars) => {
      const updateObj: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (provider !== undefined) {
        updateObj.provider = provider;
      }
      if (openrouterModel !== undefined) {
        updateObj.openrouter_model = openrouterModel;
      }

      const { error } = await getInsforge()
        .database.from('users')
        .update(updateObj)
        .eq('telegram_id', telegramId);

      if (error) throw error;
    },
    onSettled: (_data, _err, { telegramId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.user(telegramId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(telegramId),
      });
    },
  });
}
