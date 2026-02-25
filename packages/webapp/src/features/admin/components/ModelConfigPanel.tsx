/**
 * Admin panel for per-agent model configuration (18-04).
 *
 * Displays each known bot agent with its current model override status
 * and provides a searchable OpenRouter model browser for setting overrides.
 *
 * Actions:
 * - Set Override / Change: opens inline model search for the agent
 * - Remove: deactivates override, reverting agent to user's default model
 *
 * Changes persist immediately to the agent_model_config table and take
 * effect within 60 seconds via the bot's TTL cache.
 */

import { useState } from 'react';
import { Card, Skeleton, ErrorCard } from '@/shared/ui';
import {
  useModelConfigs,
  useUpsertModelConfig,
  useDeactivateModelConfig,
  KNOWN_AGENTS,
} from '@/features/admin/hooks/useModelConfig';
import {
  useOpenRouterModels,
  type OpenRouterModel,
} from '@/features/admin/hooks/useOpenRouterModels';

/** Format per-token price string to cost per 1M tokens. */
function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr) * 1_000_000;
  if (price < 0.01) return '<$0.01';
  return `$${price.toFixed(2)}`;
}

export function ModelConfigPanel() {
  const { data: configs, isLoading, isError, refetch } = useModelConfigs();
  const upsertMutation = useUpsertModelConfig();
  const deactivateMutation = useDeactivateModelConfig();
  const { data: models } = useOpenRouterModels();
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const configMap = new Map(configs?.map((c) => [c.agent_name, c]) ?? []);

  const filteredModels =
    models
      ?.filter(
        (m) =>
          m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .slice(0, 50) ?? [];

  const handleSelectModel = (agentName: string, model: OpenRouterModel) => {
    upsertMutation.mutate({ agentName, modelId: model.id });
    setEditingAgent(null);
    setSearchQuery('');
  };

  const handleRemove = (agentName: string) => {
    deactivateMutation.mutate(agentName);
  };

  const toggleEdit = (agentName: string) => {
    setEditingAgent((prev) => (prev === agentName ? null : agentName));
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Agent Model Configuration</h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Agent Model Configuration</h3>
        <ErrorCard message="Unable to load model configs" onRetry={refetch} compact />
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-text">Agent Model Configuration</h3>
      <p className="mb-3 text-xs text-text-hint">
        Override which model each agent uses. Changes take effect within 60 seconds.
      </p>

      <div className="space-y-2">
        {KNOWN_AGENTS.map((agent) => {
          const config = configMap.get(agent.name);
          const isEditing = editingAgent === agent.name;

          return (
            <div key={agent.name} className="rounded-lg bg-surface-secondary/50 px-3 py-2">
              {/* Agent row: name + status + actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-text">{agent.label}</span>
                  <span className="ml-1.5 text-xs text-text-hint">{agent.description}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {config ? (
                    <>
                      <span className="max-w-[140px] truncate rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                        {config.model_id}
                      </span>
                      <button
                        onClick={() => toggleEdit(agent.name)}
                        className="min-h-[28px] text-xs text-accent hover:underline"
                      >
                        {isEditing ? 'Cancel' : 'Change'}
                      </button>
                      <button
                        onClick={() => handleRemove(agent.name)}
                        className="min-h-[28px] text-xs text-destructive hover:underline"
                        disabled={deactivateMutation.isPending}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-text-hint">
                        Default
                      </span>
                      <button
                        onClick={() => toggleEdit(agent.name)}
                        className="min-h-[28px] text-xs text-accent hover:underline"
                      >
                        {isEditing ? 'Cancel' : 'Set Override'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline model search (shown when editing) */}
              {isEditing && (
                <div className="mt-2 border-t border-surface-secondary pt-2">
                  <input
                    type="text"
                    placeholder="Search models (e.g. claude, gpt-4o, deepseek)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg bg-surface px-3 py-2 text-sm text-text placeholder-text-hint outline-none ring-1 ring-surface-secondary focus:ring-accent"
                    autoFocus
                  />
                  {searchQuery.length >= 2 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-surface">
                      {filteredModels.length === 0 ? (
                        <div className="p-3 text-center text-sm text-text-hint">
                          No models found
                        </div>
                      ) : (
                        filteredModels.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleSelectModel(agent.name, model)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-secondary/50"
                            disabled={upsertMutation.isPending}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-text">{model.name}</div>
                              <div className="truncate text-xs text-text-hint">{model.id}</div>
                            </div>
                            <div className="shrink-0 pl-2 text-right text-xs text-text-hint">
                              {model.context_length
                                ? `${Math.round(model.context_length / 1000)}K ctx`
                                : ''}
                              {model.pricing && (
                                <div>{formatPrice(model.pricing.prompt)}/M in</div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
