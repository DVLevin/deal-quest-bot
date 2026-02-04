/**
 * Settings panel for the Profile page.
 *
 * Displays:
 * - Provider selector (OpenRouter vs Claude API) with visual toggle cards
 * - OpenRouter model selector (4 free models from bot settings)
 * - API key status with deep-link to bot for key management
 *
 * Provider and model changes persist via useUpdateSettings mutation.
 * API key management deep-links to the bot (TMA cannot access Fernet ENCRYPTION_KEY).
 */

import { Settings, Zap, Sparkles, KeyRound } from 'lucide-react';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { Card, Skeleton } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/store';
import { useUserSettings } from '../hooks/useUserSettings';
import { useUpdateSettings } from '../hooks/useUpdateSettings';

// ---------------------------------------------------------------------------
// Constants (matching bot/handlers/settings.py MODEL_KEYBOARD exactly)
// ---------------------------------------------------------------------------

const OPENROUTER_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Free)' },
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5 (Free)' },
  { id: 'google/gemini-flash', label: 'Gemini Flash (Free)' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (Free)' },
] as const;

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------

export function SettingsPanel() {
  const telegramId = useAuthStore((s) => s.telegramId);
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateSettings();

  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

  const handleProviderChange = (provider: string) => {
    if (!telegramId || provider === settings?.provider) return;
    updateSettings.mutate({ telegramId, provider });
  };

  const handleModelChange = (model: string) => {
    if (!telegramId || model === settings?.openrouterModel) return;
    updateSettings.mutate({ telegramId, openrouterModel: model });
  };

  const handleManageApiKey = () => {
    const url = `https://t.me/${botUsername}?start=settings`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(url);
    }
  };

  return (
    <Card>
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5 text-accent" />
        <h2 className="text-base font-bold text-text">Settings</h2>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton height={80} />
          <Skeleton height={120} />
          <Skeleton height={48} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Provider selector */}
          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">
              LLM Provider
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange('openrouter')}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 transition-colors ${
                  settings?.provider === 'openrouter'
                    ? 'border-accent bg-accent/5'
                    : 'border-surface-secondary bg-surface'
                }`}
              >
                <Zap
                  className={`h-4 w-4 ${
                    settings?.provider === 'openrouter'
                      ? 'text-accent'
                      : 'text-text-hint'
                  }`}
                />
                <span className="text-sm font-medium text-text">
                  OpenRouter
                </span>
                <span className="text-xs text-text-hint">(Free)</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('anthropic')}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 transition-colors ${
                  settings?.provider === 'anthropic'
                    ? 'border-accent bg-accent/5'
                    : 'border-surface-secondary bg-surface'
                }`}
              >
                <Sparkles
                  className={`h-4 w-4 ${
                    settings?.provider === 'anthropic'
                      ? 'text-accent'
                      : 'text-text-hint'
                  }`}
                />
                <span className="text-sm font-medium text-text">
                  Claude API
                </span>
                <span className="text-xs text-text-hint">(Premium)</span>
              </button>
            </div>
          </div>

          {/* Model selector (only for OpenRouter) */}
          {settings?.provider === 'openrouter' && (
            <div>
              <p className="mb-2 text-xs font-medium text-text-secondary">
                OpenRouter Model
              </p>
              <div className="space-y-1">
                {OPENROUTER_MODELS.map((model) => {
                  const isActive = settings.openrouterModel === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleModelChange(model.id)}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:bg-surface-secondary/50"
                    >
                      {/* Radio indicator */}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isActive
                            ? 'border-accent'
                            : 'border-surface-secondary'
                        }`}
                      >
                        {isActive && (
                          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                        )}
                      </span>
                      <span
                        className={`text-sm ${
                          isActive
                            ? 'font-medium text-text'
                            : 'text-text-secondary'
                        }`}
                      >
                        {model.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* API Key management */}
          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">
              API Key
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-text-hint" />
                {settings?.hasApiKey ? (
                  <span className="text-sm font-medium text-green-500">
                    Set
                  </span>
                ) : (
                  <span className="text-sm text-text-hint">
                    Not configured
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleManageApiKey}
                className="min-h-[44px] rounded-button bg-surface-secondary px-4 py-2 text-sm font-medium text-text transition-colors active:bg-surface-secondary/70"
              >
                Manage API Key
              </button>
            </div>
            <p className="mt-2 text-xs text-text-hint">
              API keys are encrypted and can only be managed through the bot
              for security.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
