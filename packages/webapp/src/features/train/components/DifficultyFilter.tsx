/**
 * Difficulty filter for train scenarios.
 *
 * Renders 4 buttons: Easy (1), Medium (2), Hard (3), Random (null).
 * Selected button uses accent variant, others use secondary.
 * 44px minimum touch targets.
 */

import { Button } from '@/shared/ui';
import { DIFFICULTY_LABELS } from '@/types/constants';

interface DifficultyFilterProps {
  /** Currently selected difficulty (null = Random) */
  selected: number | null;
  /** Callback when user selects a difficulty */
  onSelect: (difficulty: number | null) => void;
}

const OPTIONS: { label: string; value: number | null }[] = [
  { label: DIFFICULTY_LABELS[1], value: 1 },
  { label: DIFFICULTY_LABELS[2], value: 2 },
  { label: DIFFICULTY_LABELS[3], value: 3 },
  { label: 'Random', value: null },
];

export function DifficultyFilter({ selected, onSelect }: DifficultyFilterProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.label}
          variant={selected === opt.value ? 'primary' : 'secondary'}
          size="sm"
          className="flex-1"
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
