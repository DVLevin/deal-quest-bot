/**
 * Train page with step-based state machine: filter -> scenario.
 *
 * Step 'filter': DifficultyFilter + "Start Training" button.
 * Step 'scenario': ScenarioCard + TimerInput + optional ABBranching.
 *
 * Uses useScenarioPool(selectedDifficulty) to get the filtered pool,
 * then picks a random scenario when the user starts training.
 *
 * ABBranching renders conditionally when the current scenario has
 * branchingOptions (TRAIN-06 infrastructure -- activates when
 * branching scenarios are added to the pool).
 */

import { useState, useCallback, useMemo } from 'react';
import { Button, Skeleton } from '@/shared/ui';
import { DifficultyFilter } from '@/features/train/components/DifficultyFilter';
import { ScenarioCard } from '@/features/train/components/ScenarioCard';
import { TimerInput } from '@/features/train/components/TimerInput';
import { ABBranching } from '@/features/train/components/ABBranching';
import { useScenarioPool } from '@/features/train/hooks/useScenarioPool';
import type { TrainScenario } from '@/features/train/data/scenarios';

type Step = 'filter' | 'scenario';

export default function Train() {
  const [step, setStep] = useState<Step>('filter');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(
    null,
  );
  const [currentScenario, setCurrentScenario] = useState<TrainScenario | null>(
    null,
  );

  const { data: pool, isLoading } = useScenarioPool(
    selectedDifficulty ?? undefined,
  );

  const poolSize = pool?.length ?? 0;

  const handleStart = useCallback(() => {
    if (!pool || pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    setCurrentScenario(pool[randomIndex]);
    setStep('scenario');
  }, [pool]);

  const handleBack = useCallback(() => {
    setStep('filter');
    setCurrentScenario(null);
  }, []);

  // Memoize branching option handlers to satisfy hook dependency rules
  const branchingHandlers = useMemo(() => {
    if (!currentScenario?.branchingOptions) return null;
    return {
      optionA: {
        label: currentScenario.branchingOptions.optionA,
        onSelect: () => {
          // Future: track selected branch for scoring
        },
      },
      optionB: {
        label: currentScenario.branchingOptions.optionB,
        onSelect: () => {
          // Future: track selected branch for scoring
        },
      },
    };
  }, [currentScenario?.branchingOptions]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (step === 'scenario' && currentScenario) {
    return (
      <div className="space-y-4 px-4 pt-4 pb-24">
        {/* Back link */}
        <button
          onClick={handleBack}
          className="min-h-[44px] text-sm font-medium text-accent"
        >
          &larr; Back to filters
        </button>

        <ScenarioCard scenario={currentScenario} />
        <TimerInput scenarioId={currentScenario.id} />

        {/* TRAIN-06: A/B branching when scenario has branchingOptions */}
        {currentScenario.branchingOptions && branchingHandlers && (
          <ABBranching
            optionA={branchingHandlers.optionA}
            optionB={branchingHandlers.optionB}
          />
        )}
      </div>
    );
  }

  // Step: filter (default)
  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="text-xl font-bold text-text">Train</h1>

      <p className="text-sm text-text-secondary">
        Select a difficulty level and practice random sales scenarios.
      </p>

      <DifficultyFilter
        selected={selectedDifficulty}
        onSelect={setSelectedDifficulty}
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton height={80} />
          <Skeleton height={44} />
        </div>
      ) : (
        <>
          <p className="text-xs text-text-hint">
            {poolSize} scenario{poolSize !== 1 ? 's' : ''} available
          </p>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleStart}
            disabled={poolSize === 0}
          >
            Start Training
          </Button>
        </>
      )}
    </div>
  );
}
