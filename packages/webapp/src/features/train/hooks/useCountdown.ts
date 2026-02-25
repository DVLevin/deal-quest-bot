/**
 * Clock-based countdown timer hook immune to background drift.
 *
 * Uses Date.now() as the source of truth rather than incrementing a counter
 * via setInterval. This prevents drift when the Telegram WebView is
 * backgrounded (e.g., user switches to another chat).
 *
 * Listens to the document visibilitychange event to immediately recalculate
 * remaining time when the app returns to foreground.
 *
 * Timer is advisory only -- it does NOT prevent any action on expiry.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseCountdownReturn {
  /** Seconds remaining (floored, >= 0) */
  secondsLeft: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether the timer has reached 0 */
  isExpired: boolean;
  /** Start or resume the countdown */
  start: () => void;
  /** Pause the countdown */
  pause: () => void;
  /** Reset to initial duration and stop */
  reset: () => void;
}

const TICK_INTERVAL_MS = 250;

export function useCountdown(initialSeconds: number): UseCountdownReturn {
  const durationMs = initialSeconds * 1000;

  // Refs for timing state (not reactive -- avoid re-render storms)
  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);

  // Reactive state for rendering
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  /**
   * Compute remaining milliseconds based on wall-clock time.
   */
  const computeRemaining = useCallback((): number => {
    if (startTimeRef.current === null) {
      return durationMs - elapsedBeforePauseRef.current;
    }
    const elapsed = elapsedBeforePauseRef.current + (Date.now() - startTimeRef.current);
    return Math.max(0, durationMs - elapsed);
  }, [durationMs]);

  /**
   * Sync the reactive secondsLeft state from wall-clock computation.
   */
  const tick = useCallback(() => {
    const remainingMs = computeRemaining();
    const seconds = Math.ceil(remainingMs / 1000);
    setSecondsLeft(seconds);

    if (remainingMs <= 0) {
      startTimeRef.current = null;
      setIsRunning(false);
    }
  }, [computeRemaining]);

  const start = useCallback(() => {
    if (computeRemaining() <= 0) return; // Already expired
    startTimeRef.current = Date.now();
    setIsRunning(true);
  }, [computeRemaining]);

  const pause = useCallback(() => {
    if (startTimeRef.current !== null) {
      elapsedBeforePauseRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    startTimeRef.current = null;
    elapsedBeforePauseRef.current = 0;
    setIsRunning(false);
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  // Interval-based ticking while running
  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRunning, tick]);

  // Recalculate on visibility change (app returns from background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isRunning, tick]);

  const isExpired = secondsLeft <= 0;

  return { secondsLeft, isRunning, isExpired, start, pause, reset };
}
