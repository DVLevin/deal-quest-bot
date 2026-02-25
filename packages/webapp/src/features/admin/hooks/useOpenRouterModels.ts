/**
 * Hook to fetch the OpenRouter model catalog.
 *
 * Fetches the public model list from OpenRouter's API and filters to
 * text-to-text models only (excluding image generation, embedding, etc.).
 * Results are sorted alphabetically by display name.
 *
 * 10-minute staleTime since the model catalog changes infrequently.
 */

import { useQuery } from '@tanstack/react-query';

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number | null;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
}

export function useOpenRouterModels() {
  return useQuery({
    queryKey: ['openrouter', 'models'],
    queryFn: async (): Promise<OpenRouterModel[]> => {
      const resp = await fetch('https://openrouter.ai/api/v1/models');
      if (!resp.ok) throw new Error('Failed to fetch OpenRouter models');
      const json = await resp.json();
      return (json.data as OpenRouterModel[])
        .filter((m) => m.pricing && m.architecture?.modality === 'text->text')
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 10 * 60_000,
  });
}
