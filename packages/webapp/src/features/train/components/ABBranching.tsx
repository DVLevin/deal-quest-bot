/**
 * Reusable A/B sales decision branching using native Telegram buttons.
 *
 * TRAIN-06 integration: MainButton for Option A (right/primary),
 * SecondaryButton for Option B (left position, already defaulted in hook).
 *
 * When either option is selected, both buttons are hidden and the selected
 * option is confirmed visually.
 *
 * Infrastructure-ready: activates when branching scenarios are added to the
 * pool (either static or via generated_scenarios). Currently no scenarios
 * in TRAIN_POOL have branchingOptions, so this component will not render
 * for existing scenarios.
 */

import { useState, useCallback } from 'react';
import { Card, Badge } from '@/shared/ui';
import { useMainButton } from '@/shared/hooks/useMainButton';
import { useSecondaryButton } from '@/shared/hooks/useSecondaryButton';

interface ABBranchingProps {
  /** Option A configuration (maps to MainButton -- primary action) */
  optionA: { label: string; onSelect: () => void };
  /** Option B configuration (maps to SecondaryButton -- secondary action) */
  optionB: { label: string; onSelect: () => void };
  /** Whether the branching UI is visible (default: true) */
  isVisible?: boolean;
}

export function ABBranching({
  optionA,
  optionB,
  isVisible = true,
}: ABBranchingProps) {
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);

  const handleSelectA = useCallback(() => {
    setSelected('A');
    optionA.onSelect();
  }, [optionA]);

  const handleSelectB = useCallback(() => {
    setSelected('B');
    optionB.onSelect();
  }, [optionB]);

  // MainButton = Option A (right/primary position)
  useMainButton({
    text: optionA.label,
    onClick: handleSelectA,
    isVisible: isVisible && selected === null,
  });

  // SecondaryButton = Option B (left position)
  useSecondaryButton({
    text: optionB.label,
    onClick: handleSelectB,
    isVisible: isVisible && selected === null,
  });

  if (!isVisible) return null;

  if (selected !== null) {
    return (
      <Card className="text-center">
        <Badge variant="success" size="md">
          Selected: {selected === 'A' ? optionA.label : optionB.label}
        </Badge>
      </Card>
    );
  }

  // While awaiting selection, show a prompt
  return (
    <Card className="text-center">
      <p className="text-sm text-text-secondary">
        Choose your approach using the buttons below
      </p>
    </Card>
  );
}
