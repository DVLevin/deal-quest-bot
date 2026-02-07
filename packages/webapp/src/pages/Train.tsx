/**
 * Train page with step-based state machine: filter -> scenario -> results.
 *
 * Step 'filter': Arena-style difficulty selection + dramatic "Quick Start" CTA.
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

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Swords, ArrowLeft } from 'lucide-react';
import { Button, Skeleton } from '@/shared/ui';
import { DifficultyFilter } from '@/features/train/components/DifficultyFilter';
import { DifficultyRecommendation } from '@/features/train/components/DifficultyRecommendation';
import { ScenarioVariety } from '@/features/train/components/ScenarioVariety';
import { ScenarioCard } from '@/features/train/components/ScenarioCard';
import { TimerInput } from '@/features/train/components/TimerInput';
import { ABBranching } from '@/features/train/components/ABBranching';
import { ScoreResults } from '@/features/train/components/ScoreResults';
import { useScenarioPool } from '@/features/train/hooks/useScenarioPool';
import { useTrainingStats } from '@/features/train/hooks/useTrainingStats';
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

  const stats = useTrainingStats();

  // Auto-select recommended difficulty when stats load (LazyFlow smart default)
  useEffect(() => {
    if (selectedDifficulty === null && stats.recommendedDifficulty !== null) {
      setSelectedDifficulty(stats.recommendedDifficulty);
    }
  }, [stats.recommendedDifficulty, selectedDifficulty]);

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
        <button
          onClick={() => setStep('scenario')}
          className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to scenario
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
        <button
          onClick={handleBack}
          className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to arena
        </button>

        <div className="card-slide-up space-y-4">
          <ScenarioCard scenario={currentScenario} />
          <TimerInput scenarioId={currentScenario.id} />

          {/* TRAIN-06: A/B branching when scenario has branchingOptions */}
          {currentScenario.branchingOptions && branchingHandlers && (
            <ABBranching
              optionA={branchingHandlers.optionA}
              optionB={branchingHandlers.optionB}
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleViewResults}
          >
            View Results
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Filter step (default) — The Arena
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-5 px-4 pt-4 pb-24">
      {/* Arena header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
          <Swords className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-overline">Training Arena</p>
          <h1 className="text-lg font-bold text-text">Pick Your Challenge</h1>
        </div>
      </div>

      {/* Quick Start -- dramatic one-tap CTA with pulse */}
      {stats.recommendedDifficulty !== null && !isLoading && (
        <button
          type="button"
          onClick={handleStart}
          disabled={poolSize === 0}
          className="arena-pulse w-full rounded-2xl bg-accent py-4 text-center font-bold text-accent-text shadow-raised transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          style={{ animationPlayState: poolSize === 0 ? 'paused' : 'running' }}
        >
          <span className="text-base tracking-wide">Quick Start</span>
        </button>
      )}

      <DifficultyRecommendation
        recommendedDifficulty={stats.recommendedDifficulty}
        avgScoreByDifficulty={stats.avgScoreByDifficulty}
        onSelectDifficulty={(d) => setSelectedDifficulty(d)}
      />

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
          <ScenarioVariety
            unseenCount={stats.unseenCount}
            totalPoolSize={stats.totalPoolSize}
            isRunningLow={stats.isRunningLow}
          />

          <Button
            variant={stats.recommendedDifficulty !== null ? 'secondary' : 'primary'}
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
