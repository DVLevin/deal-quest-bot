/**
 * Criteria-by-criteria score breakdown list.
 *
 * Renders each ScoreBreakdownItem as a row with criterion name,
 * score/max fraction, progress bar, feedback text, optional user quote,
 * and optional suggestion with lightbulb icon.
 *
 * Returns null when breakdown is undefined or empty.
 */

import { Card, ProgressBar } from '@/shared/ui';
import type { ScoreBreakdownItem } from '../types';

interface FeedbackBreakdownProps {
  breakdown?: ScoreBreakdownItem[];
}

export function FeedbackBreakdown({ breakdown }: FeedbackBreakdownProps) {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <Card className="space-y-4">
      <h3 className="text-base font-bold text-text">Scoring Breakdown</h3>

      <div className="space-y-5">
        {breakdown.map((item, index) => (
          <div key={index} className="space-y-2">
            {/* Criterion header + score */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">
                {item.criterion}
              </span>
              <span className="shrink-0 text-sm font-semibold text-text-secondary">
                {item.score}/{item.max}
              </span>
            </div>

            {/* Progress bar */}
            <ProgressBar
              current={item.score}
              max={item.max}
              size="sm"
              showLabel={false}
            />

            {/* Feedback */}
            {item.feedback && (
              <p className="text-xs leading-relaxed text-text-secondary">
                {item.feedback}
              </p>
            )}

            {/* User quote */}
            {item.user_quote && (
              <blockquote className="border-l-2 border-accent/40 pl-3 text-xs italic text-text-hint">
                &ldquo;{item.user_quote}&rdquo;
              </blockquote>
            )}

            {/* Suggestion */}
            {item.suggestion && (
              <div className="flex items-start gap-1.5 text-xs text-info">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>{item.suggestion}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
