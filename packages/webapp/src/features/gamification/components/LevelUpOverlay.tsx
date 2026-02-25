/**
 * Full-screen celebration overlay for level-up events.
 *
 * Fires canvas-confetti cannons on mount and displays the new rank title.
 * Auto-dismisses after 5 seconds or can be dismissed with the Continue button.
 */

import { useEffect } from 'react';
import { Button } from '@/shared/ui';
import { getRankTitle } from '@deal-quest/shared';
import { fireLevelUpConfetti } from '../lib/confetti';

interface LevelUpOverlayProps {
  oldLevel: number;
  newLevel: number;
  onDismiss: () => void;
}

export function LevelUpOverlay({
  oldLevel,
  newLevel,
  onDismiss,
}: LevelUpOverlayProps) {
  const rankTitle = getRankTitle(newLevel);

  // Fire confetti on mount
  useEffect(() => {
    fireLevelUpConfetti();
  }, []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="spring-in mx-6 flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-surface p-8 shadow-modal">
        <span className="text-5xl">&#127942;</span>

        <h2 className="text-2xl font-bold text-text-primary">Level Up!</h2>

        <p className="text-lg font-semibold text-accent">{rankTitle}</p>

        <p className="text-sm text-text-secondary">
          Level {oldLevel} &rarr; Level {newLevel}
        </p>

        <Button variant="primary" size="md" onClick={onDismiss}>
          Continue
        </Button>
      </div>
    </div>
  );
}
