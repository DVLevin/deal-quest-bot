/**
 * Scenario persona card, situation text, and Practice in Bot CTA.
 *
 * Displays the scenario details for a given level: persona information,
 * difficulty badge, time limit (if present), and the situation text.
 * Uses Telegram MainButton to open a deep link to the bot for response
 * submission (TMA is display layer -- scoring happens in the bot).
 */

import { useCallback } from 'react';
import { openLink } from '@telegram-apps/sdk-react';
import { Clock, User } from 'lucide-react';
import { Card, Badge } from '@/shared/ui';
import { DIFFICULTY_LABELS } from '@deal-quest/shared';
import { useMainButton } from '@/shared/hooks/useMainButton';

interface ScenarioPracticeProps {
  scenario: {
    persona: {
      name: string;
      role: string;
      company: string;
      background: string;
      context?: string;
    };
    situation: string;
    difficulty: number;
    timeLimitSeconds?: number;
  };
  levelId: string;
}

function difficultyVariant(difficulty: number) {
  if (difficulty === 1) return 'success' as const;
  if (difficulty === 2) return 'warning' as const;
  return 'error' as const;
}

export function ScenarioPractice({ scenario, levelId }: ScenarioPracticeProps) {
  const botUsername = import.meta.env.VITE_BOT_USERNAME as string | undefined;

  const handlePractice = useCallback(() => {
    const username = botUsername ?? 'DealQuestBot';
    const url = `https://t.me/${username}?start=learn_${levelId}`;

    if (openLink.isAvailable()) {
      openLink(url, { tryInstantView: false });
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername, levelId]);

  useMainButton({
    text: 'Practice in Bot',
    onClick: handlePractice,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text">Practice Scenario</h2>

      {/* Persona card */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
            <User className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">
              {scenario.persona.name}
            </p>
            <p className="text-xs text-text-secondary">
              {scenario.persona.role} at {scenario.persona.company}
            </p>
            <p className="mt-1 text-xs text-text-hint">
              {scenario.persona.background}
            </p>
            {scenario.persona.context && (
              <p className="mt-1 text-xs italic text-text-hint">
                {scenario.persona.context}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Difficulty + time limit */}
      <div className="flex items-center gap-2">
        <Badge
          variant={difficultyVariant(scenario.difficulty)}
          size="sm"
        >
          {DIFFICULTY_LABELS[scenario.difficulty] ?? 'Unknown'}
        </Badge>
        {scenario.timeLimitSeconds && (
          <Badge variant="info" size="sm">
            <Clock className="mr-1 h-3 w-3" />
            {scenario.timeLimitSeconds}s
          </Badge>
        )}
      </div>

      {/* Situation text */}
      <div className="rounded-card border border-surface-secondary bg-surface-secondary/30 p-4">
        <p className="text-sm leading-relaxed text-text-secondary italic">
          &ldquo;{scenario.situation}&rdquo;
        </p>
      </div>
    </div>
  );
}
