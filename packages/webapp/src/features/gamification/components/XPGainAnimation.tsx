/**
 * Animated XP counter using CSS @property integer interpolation.
 *
 * Displays "+X XP" with a count-up animation from 0 to the earned value.
 * The animation is defined in globals.css via @property --xp-value.
 */

interface XPGainAnimationProps {
  xpEarned: number;
}

export function XPGainAnimation({ xpEarned }: XPGainAnimationProps) {
  return (
    <span
      className="xp-counter text-lg font-bold text-success"
      style={{ ['--xp-value' as string]: xpEarned }}
    />
  );
}
