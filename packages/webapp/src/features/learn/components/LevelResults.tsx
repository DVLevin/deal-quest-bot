/**
 * Learn level results view.
 *
 * Displays score, feedback breakdown, strengths/improvements, and ideal
 * response comparison after completing a learn scenario in the bot.
 * Reads levelId from URL params, fetches the latest attempt from InsForge,
 * and parses feedback_json safely via parseFeedback().
 *
 * LEARN-04 coverage: (1) score/100, (2) strengths, (3) improvements,
 * (4) ideal response comparison -- all rendered via shared scoring components.
 */

import { useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { openLink } from '@telegram-apps/sdk-react';
import { Button, Skeleton, Badge } from '@/shared/ui';
import { PASSING_SCORE } from '@/types/constants';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import { useAuthStore } from '@/features/auth/store';
import { TRACKS } from '@/features/learn/data/tracks';
import { parseFeedback } from '@/features/scoring/types';
import { ScoreDisplay } from '@/features/scoring/components/ScoreDisplay';
import { FeedbackBreakdown } from '@/features/scoring/components/FeedbackBreakdown';
import { StrengthsList } from '@/features/scoring/components/StrengthsList';
import type { AttemptRow } from '@/types/tables';

export function LevelResults() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const telegramId = useAuthStore((s) => s.telegramId);

  const track = TRACKS['foundations'];
  const level = track?.levels.find((l) => l.id === levelId);
  const levelIndex = track?.levels.findIndex((l) => l.id === levelId) ?? -1;
  const nextLevel =
    levelIndex >= 0 && levelIndex < track.levels.length - 1
      ? track.levels[levelIndex + 1]
      : null;

  const scenarioId = level?.scenario.id ?? '';

  const { data: attempt, isLoading } = useQuery({
    queryKey: queryKeys.attempts.latest(telegramId!, scenarioId, 'learn'),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('attempts')
        .select('*')
        .eq('telegram_id', telegramId!)
        .eq('scenario_id', scenarioId)
        .eq('mode', 'learn')
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

  const handlePractice = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=learn_${levelId}`;
    if (openLink.isAvailable()) {
      openLink(url, { tryInstantView: false });
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername, levelId]);

  if (!level) {
    return <Navigate to="/learn" replace />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pt-4 pb-4">
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
      <div className="flex flex-col items-center gap-4 px-4 pt-12">
        <p className="text-base font-semibold text-text">No results yet</p>
        <p className="text-center text-sm text-text-secondary">
          Complete this scenario in the bot to see your results.
        </p>
        <Button variant="primary" size="lg" onClick={handlePractice}>
          Practice in Bot
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/learn')}
        >
          Back to Track
        </Button>
      </div>
    );
  }

  // Parse feedback safely
  const feedback = parseFeedback(attempt.feedback_json);
  const passed = feedback.total_score >= PASSING_SCORE;

  return (
    <div className="space-y-6 px-4 pt-4 pb-24">
      {/* Back link */}
      <button
        className="flex items-center gap-1 text-sm text-accent min-h-[44px]"
        onClick={() => navigate('/learn')}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Track
      </button>

      {/* Score display */}
      <ScoreDisplay
        score={feedback.total_score}
        xpEarned={feedback.xp_earned}
      />

      {/* Pass/fail status */}
      <div className="text-center">
        {passed ? (
          <Badge variant="success" size="md">
            Level Complete!
          </Badge>
        ) : (
          <Badge variant="warning" size="md">
            Keep Practicing
          </Badge>
        )}
      </div>

      {/* Next level unlock */}
      {passed && nextLevel && (
        <div className="rounded-card border border-success/30 bg-success/10 p-3 text-center">
          <p className="text-sm font-medium text-success">
            Next level unlocked!
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {nextLevel.name}
          </p>
        </div>
      )}

      {/* LEARN-04: Strengths, improvements, and ideal response comparison */}
      <StrengthsList
        strengths={feedback.strengths}
        improvements={feedback.improvements}
        idealComparison={feedback.ideal_response_comparison}
      />

      {/* LEARN-04: Detailed scoring breakdown */}
      <FeedbackBreakdown breakdown={feedback.breakdown} />

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={() => navigate('/learn')}
        >
          Back to Track
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={handlePractice}
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
