/**
 * Countdown timer display with response area and MainButton deep link.
 *
 * Timer starts automatically on mount. Displays MM:SS with color shifts:
 * - accent (normal) -> warning (< 30s) -> error (< 10s)
 *
 * Timer is advisory only -- does NOT disable input or MainButton on expiry.
 * MainButton deep links to the bot for actual practice submission.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { Card } from '@/shared/ui';
import { useMainButton } from '@/shared/hooks/useMainButton';
import { useCountdown } from '../hooks/useCountdown';

interface TimerInputProps {
  /** Countdown duration in seconds (default 120) */
  initialSeconds?: number;
  /** Scenario ID for the deep link */
  scenarioId: string;
  /** Callback after deep link is opened */
  onSubmit?: () => void;
}

/**
 * Format seconds into MM:SS string.
 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Determine timer color based on seconds remaining.
 */
function timerColorClass(seconds: number, isExpired: boolean): string {
  if (isExpired) return 'text-error';
  if (seconds <= 10) return 'text-error';
  if (seconds <= 30) return 'text-warning';
  return 'text-accent';
}

export function TimerInput({
  initialSeconds = 120,
  scenarioId,
  onSubmit,
}: TimerInputProps) {
  const { secondsLeft, isExpired, start } = useCountdown(initialSeconds);

  // Auto-start on mount
  useEffect(() => {
    start();
  }, [start]);

  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';
  const deepLink = useMemo(
    () => `https://t.me/${botUsername}?start=train_${scenarioId}`,
    [botUsername, scenarioId],
  );

  const handleSubmit = useCallback(() => {
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(deepLink);
    } else {
      window.open(deepLink, '_blank');
    }
    onSubmit?.();
  }, [deepLink, onSubmit]);

  useMainButton({
    text: 'Practice in Bot',
    onClick: handleSubmit,
    isVisible: true,
  });

  return (
    <Card className="space-y-4">
      {/* Timer display */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={`font-mono text-4xl font-bold transition-colors ${timerColorClass(secondsLeft, isExpired)}`}
        >
          {formatTime(secondsLeft)}
        </span>
        {isExpired ? (
          <span className="text-sm font-medium text-error">
            Time&apos;s up!
          </span>
        ) : (
          <span className="text-xs text-text-hint">Time remaining</span>
        )}
      </div>

      {/* Response text area (display-only, actual submission goes to bot) */}
      <textarea
        className="w-full resize-none rounded-lg border border-surface-secondary bg-surface-secondary p-3 text-sm text-text placeholder:text-text-hint focus:border-accent focus:outline-none"
        rows={5}
        placeholder="Draft your response here (optional -- practice happens in the bot)"
        aria-label="Response draft"
      />
    </Card>
  );
}
