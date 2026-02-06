/**
 * Hooks for agent model configuration CRUD operations.
 *
 * Provides React Query hooks to read, upsert, and deactivate per-agent model
 * overrides stored in the `agent_model_config` InsForge table.
 *
 * Uses the same query pattern as useTeamStats/useRecentActivity with
 * centralized queryKeys and getInsforge() database client.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

export interface AgentModelConfig {
  id: number;
  agent_name: string;
  model_id: string;
  is_active: boolean;
  set_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Known agents in the bot pipeline system. */
export const KNOWN_AGENTS = [
  { name: 'strategist', label: 'Strategist', description: 'Deal analysis & strategy' },
  { name: 'extraction', label: 'Extraction', description: 'Screenshot OCR' },
  { name: 'trainer', label: 'Trainer', description: 'Response scoring' },
  { name: 'memory', label: 'Memory', description: 'User memory updates' },
  { name: 'reanalysis_strategist', label: 'Re-analysis', description: 'Strategy re-analysis' },
] as const;

/**
 * Fetch all active agent model configurations.
 *
 * Returns only rows where is_active = true (soft-deleted overrides are excluded).
 * 30-second staleTime since admin may want to see recent changes quickly.
 */
export function useModelConfigs() {
  return useQuery({
    queryKey: queryKeys.admin.modelConfigs,
    queryFn: async (): Promise<AgentModelConfig[]> => {
      const db = getInsforge().database;
      const { data, error } = await db
        .from('agent_model_config')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as AgentModelConfig[];
    },
    staleTime: 30_000,
  });
}

/**
 * Upsert a model override for a given agent.
 *
 * If a row already exists for the agent_name (active or not), updates it.
 * Otherwise inserts a new row. Invalidates the modelConfigs query on success.
 */
export function useUpsertModelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agentName,
      modelId,
      setBy,
    }: {
      agentName: string;
      modelId: string;
      setBy?: string;
    }) => {
      const db = getInsforge().database;

      // Check if a row already exists for this agent (active or inactive)
      const { data: existing } = await db
        .from('agent_model_config')
        .select('id')
        .eq('agent_name', agentName)
        .limit(1);

      if (existing && existing.length > 0) {
        const { data, error } = await db
          .from('agent_model_config')
          .update({
            model_id: modelId,
            is_active: true,
            set_by: setBy ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('agent_name', agentName)
          .select();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await db
          .from('agent_model_config')
          .insert({
            agent_name: agentName,
            model_id: modelId,
            is_active: true,
            set_by: setBy ?? null,
          })
          .select();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.modelConfigs });
    },
  });
}

/**
 * Deactivate (soft-delete) a model override for a given agent.
 *
 * Sets is_active = false so the bot falls back to the user's default model.
 * The row is preserved for audit trail purposes.
 */
export function useDeactivateModelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentName: string) => {
      const db = getInsforge().database;
      const { data, error } = await db
        .from('agent_model_config')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('agent_name', agentName)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.modelConfigs });
    },
  });
}
