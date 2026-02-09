/**
 * Smart landing hook that determines dashboard focus mode.
 *
 * Composes useTodayActions and useUserProgress to decide which content
 * should be promoted to the top of the Dashboard. Overdue actions take
 * highest priority, followed by active streaks.
 *
 * Session resume: reads localStorage for last-viewed path within 24h.
 * The stored entry is consumed (one-shot) so subsequent visits get
 * normal smart landing.
 *
 * TMAUX-V20-17-01: Smart Landing
 * TMAUX-V21-04: Session Resume
 */

import { useRef } from 'react';
import { useTodayActions } from '@/features/leads/hooks/useTodayActions';
import { useUserProgress } from './useUserProgress';

export type LandingFocus = 'actions-focus' | 'streak-focus' | 'default';

const SESSION_KEY = 'dq_last_path';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SmartLandingResult {
  focus: LandingFocus;
  isReady: boolean;
  overdueCount: number;
  streakDays: number;
  resumePath: string | null;
}

/**
 * Read and consume the stored session path (one-shot).
 * Returns null if missing, expired, or pointing at root.
 */
function consumeResumePath(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    // Always remove after reading (one-shot)
    localStorage.removeItem(SESSION_KEY);

    const parsed = JSON.parse(raw) as { path: string; ts: number };
    if (!parsed.path || parsed.path === '/') return null;

    // Expire after 24 hours
    if (Date.now() - parsed.ts > SESSION_MAX_AGE_MS) return null;

    return parsed.path;
  } catch {
    return null;
  }
}

export function useSmartLanding(): SmartLandingResult {
  const { data: actions, isLoading: actionsLoading } = useTodayActions();
  const { data: user, isLoading: userLoading } = useUserProgress();

  // Consume resume path once on mount and cache in ref (survives re-renders)
  const resumeRef = useRef<string | null | undefined>(undefined);
  if (resumeRef.current === undefined) {
    resumeRef.current = consumeResumePath();
  }

  if (actionsLoading || userLoading) {
    return { focus: 'default', isReady: false, overdueCount: 0, streakDays: 0, resumePath: null };
  }

  const overdueCount = actions?.filter((a) => a.isOverdue).length ?? 0;
  const streakDays = user?.streak_days ?? 0;

  let focus: LandingFocus = 'default';
  if (overdueCount > 0) {
    focus = 'actions-focus';
  } else if (streakDays > 0) {
    focus = 'streak-focus';
  }

  return { focus, isReady: true, overdueCount, streakDays, resumePath: resumeRef.current };
}
