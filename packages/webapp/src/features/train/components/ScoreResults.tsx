/**
 * Train score results with XP animation and quick action buttons.
 *
 * Fetches the latest attempt for the given scenario from InsForge,
 * parses feedback_json via parseFeedback(), and renders animated
 * scoring components + 3 quick action buttons (TRAIN-05).
 *
 * Quick actions:
 * - Next Scenario (accent) -> calls onNextScenario
 * - Retry (secondary) -> calls onRetry (deep link to bot)
 * - View Stats (secondary) -> navigates to /profile
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { Button, Skeleton } from '@/shared/ui';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import { useAuthStore } from '@/features/auth/store';
import { parseFeedback } from '@/features/scoring/types';
import { ScoreDisplay } from '@/features/scoring/components/ScoreDisplay';
import { FeedbackBreakdown } from '@/features/scoring/components/FeedbackBreakdown';
import { StrengthsList } from '@/features/scoring/components/StrengthsList';
import type { AttemptRow } from '@/types/tables';

interface ScoreResultsProps {
  scenarioId: string;
  onNextScenario: () => void;
  onRetry: () => void;
}

export function ScoreResults({
  scenarioId,
  onNextScenario,
  onRetry,
}: ScoreResultsProps) {
  const navigate = useNavigate();
  const telegramId = useAuthStore((s) => s.telegramId);

  const { data: attempt, isLoading } = useQuery({
    queryKey: queryKeys.attempts.latest(telegramId!, scenarioId, 'train'),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('attempts')
        .select('*')
        .eq('telegram_id', telegramId!)
        .eq('scenario_id', scenarioId)
        .eq('mode', 'train')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      const rows = (data ?? []) as AttemptRow[];
      return rows[0] ?? null;
    },
    enabled: !!telegramId && !!scenarioId,
    refetchOnWindowFocus: true,
  });

  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

  const handleRetry = useCallback(() => {
    const deepLink = `https://t.me/${botUsername}?start=train_${scenarioId}`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(deepLink);
    } else {
      window.open(deepLink, '_blank');
    }
    onRetry();
  }, [botUsername, scenarioId, onRetry]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <Skeleton width={144} height={144} className="rounded-full" />
        </div>
        <Skeleton height={24} />
        <Skeleton height={120} />
        <Skeleton height={160} />
      </div>
    );
  }

  // No attempt found
  if (!attempt) {
    return (
      <div className="flex flex-col items-center gap-4 pt-8">
        <p className="text-base font-semibold text-text">
          Complete this scenario in the bot first
        </p>
        <p className="text-center text-sm text-text-secondary">
          Practice in the bot, then return here to see your results.
        </p>
        <Button variant="primary" size="md" onClick={handleRetry}>
          Practice in Bot
        </Button>
      </div>
    );
  }

  // Parse feedback safely
  const feedback = parseFeedback(attempt.feedback_json);

  return (
    <div className="space-y-6">
      {/* Animated score display */}
      <ScoreDisplay
        score={feedback.total_score}
        xpEarned={feedback.xp_earned}
        animate={true}
      />

      {/* Strengths + improvements */}
      <StrengthsList
        strengths={feedback.strengths}
        improvements={feedback.improvements}
        idealComparison={feedback.ideal_response_comparison}
      />

      {/* Detailed breakdown */}
      <FeedbackBreakdown breakdown={feedback.breakdown} />

      {/* TRAIN-05: Quick action buttons */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={onNextScenario}
        >
          Next Scenario
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={handleRetry}
        >
          Retry
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={() => navigate('/profile')}
        >
          View Stats
        </Button>
      </div>
    </div>
  );
}
