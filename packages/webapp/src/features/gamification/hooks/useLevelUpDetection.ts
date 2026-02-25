/**
 * Hook that detects level-up events by comparing cached vs fresh user data.
 *
 * Uses a ref to track the previous level and sessionStorage to prevent
 * re-triggering celebrations on page reloads. Only fires when real
 * progression is detected (previous level was loaded AND new level is higher).
 */

import { useRef, useState, useEffect } from 'react';
import { useUserProgress } from '@/features/dashboard/hooks/useUserProgress';

interface LevelUp {
  oldLevel: number;
  newLevel: number;
}

const SESSION_KEY = 'dq_last_celebrated_level';

export function useLevelUpDetection() {
  const { data: user } = useUserProgress();
  const previousLevel = useRef<number>(0);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);

  useEffect(() => {
    if (!user) return;

    const currentLevel = user.current_level;
    const lastCelebrated = parseInt(
      sessionStorage.getItem(SESSION_KEY) ?? '0',
      10,
    );

    // Only trigger if we had real prior data (not initial load)
    // AND level actually increased AND we haven't celebrated this level yet
    if (
      previousLevel.current > 0 &&
      currentLevel > previousLevel.current &&
      currentLevel > lastCelebrated
    ) {
      setLevelUp({
        oldLevel: previousLevel.current,
        newLevel: currentLevel,
      });
      sessionStorage.setItem(SESSION_KEY, String(currentLevel));
    }

    previousLevel.current = currentLevel;
  }, [user]);

  const dismiss = () => setLevelUp(null);

  return { levelUp, dismiss };
}
