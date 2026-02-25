/**
 * Structured display of prospect analysis from support output.
 *
 * Shows prospect type, seniority, buying signal strength, stage,
 * key concern, background leverage, and company context.
 */

import { Card, Badge } from '@/shared/ui';
import { User, TrendingUp } from 'lucide-react';
import type { SupportAnalysis } from '../types';

interface AnalysisDisplayProps {
  analysis: SupportAnalysis;
}

function signalVariant(signal: string) {
  const lower = signal.toLowerCase();
  if (lower === 'high' || lower === 'strong') return 'success' as const;
  if (lower === 'medium' || lower === 'moderate') return 'warning' as const;
  return 'error' as const;
}

export function AnalysisDisplay({ analysis }: AnalysisDisplayProps) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">Prospect Analysis</h3>
      </div>

      {/* Prospect type & seniority badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="brand" size="sm">{analysis.prospect_type}</Badge>
        <Badge variant="info" size="sm">{analysis.seniority}</Badge>
      </div>

      {/* Stage and buying signal */}
      <Card padding="sm" className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary">Stage</span>
          <Badge variant="default" size="sm">{analysis.stage}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary">
              Buying Signal
            </span>
          </div>
          <Badge variant={signalVariant(analysis.buying_signal)} size="sm">
            {analysis.buying_signal}
          </Badge>
        </div>
        {analysis.buying_signal_reason && (
          <p className="text-xs text-text-hint">
            {analysis.buying_signal_reason}
          </p>
        )}
      </Card>

      {/* Key concern */}
      {analysis.key_concern && (
        <Card
          padding="sm"
          className="border border-warning/20 bg-warning/5"
        >
          <p className="text-xs font-medium text-warning">Key Concern</p>
          <p className="mt-1 text-sm text-text-secondary">
            {analysis.key_concern}
          </p>
        </Card>
      )}

      {/* Background leverage & company context */}
      {analysis.background_leverage && (
        <div>
          <p className="text-xs font-medium text-text-secondary">
            Background Leverage
          </p>
          <p className="mt-0.5 text-sm text-text">
            {analysis.background_leverage}
          </p>
        </div>
      )}

      {analysis.company_context && (
        <div>
          <p className="text-xs font-medium text-text-secondary">
            Company Context
          </p>
          <p className="mt-0.5 text-sm text-text">
            {analysis.company_context}
          </p>
        </div>
      )}
    </div>
  );
}
