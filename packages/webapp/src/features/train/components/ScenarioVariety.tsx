/**
 * Indicator showing remaining unseen scenarios with a low-pool nudge.
 *
 * Displays "X of Y scenarios unseen" as a text line.
 * When isRunningLow is true (unseenCount <= 3), shows an additional nudge
 * encouraging the user to revisit past scenarios.
 *
 * Returns null when totalPoolSize is 0 (no scenarios available).
 */

interface ScenarioVarietyProps {
  unseenCount: number;
  totalPoolSize: number;
  isRunningLow: boolean;
}

export function ScenarioVariety({
  unseenCount,
  totalPoolSize,
  isRunningLow,
}: ScenarioVarietyProps) {
  if (totalPoolSize === 0) return null;

  return (
    <div>
      <p className="text-xs text-text-hint">
        {unseenCount} of {totalPoolSize} scenario{totalPoolSize !== 1 ? 's' : ''} unseen
      </p>

      {isRunningLow && (
        <p className="mt-0.5 text-xs text-warning">
          Only {unseenCount} left! Great coverage — consider revisiting past scenarios.
        </p>
      )}
    </div>
  );
}
