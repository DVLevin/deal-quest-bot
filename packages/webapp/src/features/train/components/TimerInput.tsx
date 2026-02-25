/**
 * Arena countdown timer with circular ring display and response area.
 *
 * Timer starts automatically on mount. Renders an SVG ring that depletes
 * as time runs out, with color shifting:
 * - accent (normal) -> warning (< 30s) -> error (< 10s)
 *
 * Timer is advisory only -- does NOT disable input or MainButton on expiry.
 * MainButton deep links to the bot for actual practice submission.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { Mic } from 'lucide-react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
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

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function timerColor(seconds: number, isExpired: boolean): string {
  if (isExpired) return 'var(--color-error)';
  if (seconds <= 10) return 'var(--color-error)';
  if (seconds <= 30) return 'var(--color-warning)';
  return 'var(--color-accent)';
}

function timerTextClass(seconds: number, isExpired: boolean): string {
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

  const progress = isExpired ? 0 : secondsLeft / initialSeconds;
  const dashArray = `${progress * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  const color = timerColor(secondsLeft, isExpired);

  return (
    <Card className="space-y-4">
      {/* Circular timer ring */}
      <div className="flex flex-col items-center gap-2">
        <div className={cn('relative h-32 w-32', isExpired && secondsLeft % 2 === 0 && 'timer-urgent')}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="var(--color-surface-secondary)"
              strokeWidth="6"
            />
            {/* Depleting ring */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Center digits */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                'font-mono text-3xl font-black transition-colors',
                timerTextClass(secondsLeft, isExpired),
              )}
            >
              {formatTime(secondsLeft)}
            </span>
            {isExpired ? (
              <span className="text-xs font-bold text-error">TIME&apos;S UP</span>
            ) : (
              <span className="text-[10px] text-text-hint">remaining</span>
            )}
          </div>
        </div>
      </div>

      {/* Response text area */}
      <textarea
        className="w-full resize-none rounded-xl border border-surface-secondary bg-surface-secondary/50 p-3 text-sm text-text placeholder:text-text-hint focus:border-accent focus:outline-none"
        rows={5}
        placeholder="Draft your response here (optional — practice happens in the bot)"
        aria-label="Response draft"
      />

      {/* Voice hint */}
      <div className="flex items-center gap-2 rounded-xl bg-accent/8 px-3 py-2">
        <Mic className="h-3.5 w-3.5 shrink-0 text-accent" />
        <p className="text-xs text-text-secondary">
          Prefer talking? Send a voice message in the bot — we&apos;ll transcribe and score it!
        </p>
      </div>
    </Card>
  );
}
