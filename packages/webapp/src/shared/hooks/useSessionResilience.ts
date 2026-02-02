/**
 * Save and restore state when TMA is backgrounded/activated.
 *
 * Uses miniApp.isActive signal to detect background/foreground transitions.
 * Persists provided state to sessionStorage on deactivate,
 * restores on activate.
 */

import { useEffect, useRef, useCallback } from 'react';
import { miniApp } from '@telegram-apps/sdk-react';

const STORAGE_PREFIX = 'dq_session_';

export interface UseSessionResilienceOptions<T> {
  /** Unique key for this state slice */
  key: string;
  /** Current state value to persist */
  state: T;
  /** Callback to restore state from storage */
  onRestore: (saved: T) => void;
}

export function useSessionResilience<T>({
  key,
  state,
  onRestore,
}: UseSessionResilienceOptions<T>): void {
  const stateRef = useRef(state);
  stateRef.current = state;

  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const storageKey = `${STORAGE_PREFIX}${key}`;

  // Try to restore on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        onRestoreRef.current(parsed);
        // Clear after restore to avoid stale data
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore parse errors -- stale or corrupt data
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const save = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(stateRef.current));
    } catch {
      // sessionStorage may be full or unavailable in some WebViews
    }
  }, [storageKey]);

  // Subscribe to miniApp.isActive signal for background/foreground
  useEffect(() => {
    // miniApp.isActive is a Computed signal with .sub() method
    const isActive = miniApp.isActive;

    // Guard: if miniApp isn't mounted, isActive may not work
    if (!isActive || typeof isActive.sub !== 'function') return;

    const unsubscribe = isActive.sub((active: boolean) => {
      if (!active) {
        // Going to background -- save state
        save();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [save]);

  // Also save on page visibility change as fallback
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        save();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [save]);
}
