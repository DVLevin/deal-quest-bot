/**
 * Canvas-confetti configuration presets for celebration animations.
 *
 * Uses canvas-confetti library with disableForReducedMotion: true
 * to respect the prefers-reduced-motion accessibility setting.
 */

import confetti from 'canvas-confetti';

const defaults: confetti.Options = {
  spread: 60,
  ticks: 100,
  gravity: 1.2,
  decay: 0.94,
  startVelocity: 30,
  particleCount: 40,
  scalar: 1.2,
  disableForReducedMotion: true,
};

/** Fire confetti cannons from both sides of the screen on level-up. */
export function fireLevelUpConfetti() {
  // Left cannon
  confetti({ ...defaults, angle: 60, origin: { x: 0, y: 0.7 } });
  // Right cannon
  confetti({ ...defaults, angle: 120, origin: { x: 1, y: 0.7 } });
}
