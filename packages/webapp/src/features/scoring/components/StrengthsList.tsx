/**
 * Strengths, improvements, and ideal response comparison display.
 *
 * Three conditional sections:
 * 1. Strengths -- green checkmark + list
 * 2. Improvements -- orange arrow-up + list
 * 3. Ideal response comparison -- bullet list of what the ideal did differently
 *
 * All sections use optional chaining and only render when data is present.
 */

import { Card } from '@/shared/ui';
import type { IdealComparison } from '../types';

interface StrengthsListProps {
  strengths?: string[];
  improvements?: string[];
  idealComparison?: IdealComparison;
}

export function StrengthsList({
  strengths,
  improvements,
  idealComparison,
}: StrengthsListProps) {
  const hasStrengths = strengths && strengths.length > 0;
  const hasImprovements = improvements && improvements.length > 0;
  const hasIdeal =
    idealComparison?.what_ideal_did_differently &&
    idealComparison.what_ideal_did_differently.length > 0;

  if (!hasStrengths && !hasImprovements && !hasIdeal) return null;

  return (
    <Card className="space-y-5">
      {/* Strengths */}
      {hasStrengths && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {/* Green checkmark */}
            <svg
              className="h-5 w-5 shrink-0 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-sm font-bold text-text">Strengths</h3>
          </div>
          <ul className="space-y-1.5 pl-7">
            {strengths.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed text-text-secondary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {hasImprovements && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {/* Orange arrow-up */}
            <svg
              className="h-5 w-5 shrink-0 text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <h3 className="text-sm font-bold text-text">Areas for Improvement</h3>
          </div>
          <ul className="space-y-1.5 pl-7">
            {improvements.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed text-text-secondary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ideal response comparison */}
      {hasIdeal && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {/* Lightbulb icon */}
            <svg
              className="h-5 w-5 shrink-0 text-info"
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
            <h3 className="text-sm font-bold text-text">
              What the ideal response did differently
            </h3>
          </div>
          <ul className="space-y-1.5 pl-7">
            {idealComparison.what_ideal_did_differently!.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed text-text-secondary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
