/**
 * Scenario card displaying persona details, difficulty badge, and situation.
 *
 * Shows the persona's name, role + company, background, difficulty level,
 * category tag, and the scenario situation text in a styled blockquote.
 */

import { Card, Badge } from '@/shared/ui';
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

  return (
    <Card className="space-y-3">
      {/* Header: persona info + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-text">
            {persona.name}
          </h3>
          <p className="text-sm text-text-secondary">
            {persona.role} &middot; {persona.company}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Badge
            variant={DIFFICULTY_VARIANT[difficulty] ?? 'default'}
            size="sm"
          >
            {DIFFICULTY_LABELS[difficulty] ?? `Lvl ${difficulty}`}
          </Badge>
        </div>
      </div>

      {/* Background */}
      {persona.background && (
        <p className="text-xs text-text-hint">{persona.background}</p>
      )}

      {/* Category tag */}
      <Badge variant="info" size="sm">
        {formatCategory(category)}
      </Badge>

      {/* Situation blockquote */}
      <blockquote className="rounded-lg border-l-4 border-accent/40 bg-surface-secondary p-3 text-sm italic text-text-secondary">
        {situation}
      </blockquote>
    </Card>
  );
}
