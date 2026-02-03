/**
 * Train page with step-based state machine: filter -> scenario -> results.
 *
 * Step 'filter': DifficultyFilter + "Start Training" button.
 * Step 'scenario': ScenarioCard + TimerInput + optional ABBranching + View Results.
 * Step 'results': ScoreResults with quick action buttons (TRAIN-05).
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
import { ScoreResults } from '@/features/train/components/ScoreResults';
import { useScenarioPool } from '@/features/train/hooks/useScenarioPool';
import type { TrainScenario } from '@/features/train/data/scenarios';

type Step = 'filter' | 'scenario' | 'results';

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

  const pickRandomScenario = useCallback(
    (excludeId?: string) => {
      if (!pool || pool.length === 0) return null;
      const available = excludeId
        ? pool.filter((s) => s.id !== excludeId)
        : pool;
      const source = available.length > 0 ? available : pool;
      const randomIndex = Math.floor(Math.random() * source.length);
      return source[randomIndex];
    },
    [pool],
  );

  const handleStart = useCallback(() => {
    const scenario = pickRandomScenario();
    if (!scenario) return;
    setCurrentScenario(scenario);
    setStep('scenario');
  }, [pickRandomScenario]);

  const handleBack = useCallback(() => {
    setStep('filter');
    setCurrentScenario(null);
  }, []);

  const handleViewResults = useCallback(() => {
    setStep('results');
  }, []);

  const handleNextScenario = useCallback(() => {
    const next = pickRandomScenario(currentScenario?.id);
    if (next) {
      setCurrentScenario(next);
      setStep('scenario');
    }
  }, [pickRandomScenario, currentScenario?.id]);

  const handleRetry = useCallback(() => {
    // Deep link handled inside ScoreResults; just go back to scenario view
    setStep('scenario');
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
  // Render: Results step
  // -------------------------------------------------------------------------

  if (step === 'results' && currentScenario) {
    return (
      <div className="space-y-4 px-4 pt-4 pb-24">
        {/* Back link */}
        <button
          onClick={() => setStep('scenario')}
          className="min-h-[44px] text-sm font-medium text-accent"
        >
          &larr; Back to scenario
        </button>

        <ScoreResults
          scenarioId={currentScenario.id}
          onNextScenario={handleNextScenario}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Scenario step
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

        {/* View Results button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={handleViewResults}
        >
          View Results
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Filter step (default)
  // -------------------------------------------------------------------------

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
