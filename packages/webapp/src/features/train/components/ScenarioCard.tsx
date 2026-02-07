/**
 * Arena-style scenario card displaying persona as a "character card".
 *
 * Shows difficulty-colored accent bar, persona name + role, background,
 * category badge, and a dramatic situation blockquote.
 */

import { Card, Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { DIFFICULTY_LABELS } from '@/types/constants';
import type { TrainScenario } from '../data/scenarios';

interface ScenarioCardProps {
  scenario: TrainScenario;
}

const DIFFICULTY_VARIANT: Record<number, 'success' | 'warning' | 'error'> = {
  1: 'success',
  2: 'warning',
  3: 'error',
};

const DIFFICULTY_ACCENT: Record<number, string> = {
  1: 'oklch(0.72 0.19 150)',
  2: 'oklch(0.80 0.18 85)',
  3: 'oklch(0.65 0.22 25)',
};

/**
 * Format snake_case category to human-readable label.
 * e.g., "corporate_objection" -> "Corporate Objection"
 */
function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const { persona, difficulty, category, situation } = scenario;
  const accentColor = DIFFICULTY_ACCENT[difficulty] ?? 'var(--color-accent)';

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Difficulty accent bar at top */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accentColor }}
      />

      <div className="space-y-3 p-4">
        {/* Header: persona info + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Persona initial circle + name */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                style={{ backgroundColor: accentColor }}
              >
                {persona.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-text">
                  {persona.name}
                </h3>
                <p className="text-sm text-text-secondary">
                  {persona.role} &middot; {persona.company}
                </p>
              </div>
            </div>
          </div>
          <Badge
            variant={DIFFICULTY_VARIANT[difficulty] ?? 'default'}
            size="sm"
            className="shrink-0"
          >
            {DIFFICULTY_LABELS[difficulty] ?? `Lvl ${difficulty}`}
          </Badge>
        </div>

        {/* Background */}
        {persona.background && (
          <p className="text-xs leading-relaxed text-text-hint">{persona.background}</p>
        )}

        {/* Category tag */}
        <Badge variant="info" size="sm">
          {formatCategory(category)}
        </Badge>

        {/* Situation blockquote — the challenge */}
        <blockquote
          className={cn(
            'rounded-xl border-l-4 p-3 text-sm leading-relaxed italic text-text-secondary',
            'bg-surface-secondary/60',
          )}
          style={{ borderLeftColor: accentColor }}
        >
          {situation}
        </blockquote>
      </div>
    </Card>
  );
}
