/**
 * Closing strategy display with numbered steps and objection handling.
 *
 * Renders strategy steps as a numbered list with principle (bold) and
 * detail (body). Shows anticipated objection in a warning callout with
 * the recommended response beneath.
 */

import { Card } from '@/shared/ui';
import { Target, AlertTriangle } from 'lucide-react';
import type { SupportStrategy } from '../types';

interface StrategyDisplayProps {
  strategy: SupportStrategy;
}

export function StrategyDisplay({ strategy }: StrategyDisplayProps) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">Closing Strategy</h3>
      </div>

      {/* Strategy steps */}
      {strategy.steps.length > 0 && (
        <div className="space-y-2">
          {strategy.steps.map((step, index) => (
            <Card key={index} padding="sm">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">
                    {step.principle}
                  </p>
                  {step.detail && (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Anticipated objection */}
      {strategy.anticipated_objection && (
        <Card
          padding="sm"
          className="border border-warning/20 bg-warning/5"
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <p className="text-xs font-medium text-warning">
              Anticipated Objection
            </p>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {strategy.anticipated_objection}
          </p>
        </Card>
      )}

      {/* Objection response */}
      {strategy.objection_response && (
        <div>
          <p className="text-xs font-medium text-text-secondary">
            Recommended Response
          </p>
          <p className="mt-0.5 text-sm text-text">
            {strategy.objection_response}
          </p>
        </div>
      )}
    </div>
  );
}
