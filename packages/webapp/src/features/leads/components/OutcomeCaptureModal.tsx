/**
 * Modal overlay for capturing closure reasons when a lead is moved to
 * closed_won or closed_lost. Displays quick-select pills based on the
 * outcome type. Supports "Skip" to proceed without a reason.
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import type { LeadStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Closure reason constants
// ---------------------------------------------------------------------------

export const CLOSURE_WON_REASONS = [
  'Strong relationship',
  'Competitive pricing',
  'Product fit',
  'Great timing',
  'Referral / warm intro',
  'Persistent follow-up',
  'Executive sponsor',
  'Other',
] as const;

export const CLOSURE_LOST_REASONS = [
  'Went with competitor',
  'Budget constraints',
  'No decision made',
  'Bad timing',
  'Lost contact',
  'Wrong persona',
  'Product gap',
  'Other',
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClosureReason = (typeof CLOSURE_WON_REASONS)[number] | (typeof CLOSURE_LOST_REASONS)[number];

interface OutcomeCaptureModalProps {
  /** The status being set (closed_won or closed_lost). */
  outcomeStatus: Extract<LeadStatus, 'closed_won' | 'closed_lost'>;
  /** Called with the selected reason (or null if skipped). */
  onConfirm: (reason: string | null) => void;
  /** Called when user dismisses without selecting. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutcomeCaptureModal({
  outcomeStatus,
  onConfirm,
  onDismiss,
}: OutcomeCaptureModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const isWon = outcomeStatus === 'closed_won';
  const reasons = isWon ? CLOSURE_WON_REASONS : CLOSURE_LOST_REASONS;
  const title = isWon ? 'Why did you win?' : 'Why was this lost?';
  const subtitle = isWon
    ? 'Help improve your playbook by noting what worked.'
    : 'Understanding losses helps sharpen your approach.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="card-slide-up w-full max-w-lg rounded-t-2xl bg-surface p-5 pb-8 shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text">{title}</h3>
            <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-hint transition-colors active:bg-surface-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick-select pills */}
        <div className="flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setSelected(selected === reason ? null : reason)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                selected === reason
                  ? isWon
                    ? 'bg-success/20 text-success ring-2 ring-success/40'
                    : 'bg-error/20 text-error ring-2 ring-error/40'
                  : 'bg-surface-secondary text-text-secondary'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => onConfirm(null)}
            className="flex-1 rounded-xl bg-surface-secondary px-4 py-3 text-sm font-medium text-text-secondary transition-colors active:bg-surface-secondary/70"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={!selected}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 ${
              isWon
                ? 'bg-success text-white'
                : 'bg-error text-white'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
