/**
 * Hook to fetch current user's LLM settings (provider, model, API key status).
 *
 * Queries the users table for provider, openrouter_model, and encrypted_api_key
 * presence. Never exposes the actual encrypted key value.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import { useAuthStore } from '@/features/auth/store';

export interface UserSettings {
  provider: string;
  openrouterModel: string;
  hasApiKey: boolean;
}

export function useUserSettings() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery<UserSettings>({
    queryKey: queryKeys.settings.user(telegramId ?? 0),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('provider, openrouter_model, encrypted_api_key')
        .eq('telegram_id', telegramId!)
        .limit(1);

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('User not found');

      return {
        provider: (row as Record<string, unknown>).provider as string ?? 'openrouter',
        openrouterModel: (row as Record<string, unknown>).openrouter_model as string ?? 'openai/gpt-oss-120b',
        hasApiKey: !!(row as Record<string, unknown>).encrypted_api_key,
      };
    },
    enabled: !!telegramId,
  });
}
