/**
 * CantPerformFlow -- progressive disclosure flow for skipping a step with a reason.
 *
 * Two phases:
 * 1. Initial: subtle "Can't do this?" link at the bottom of the action screen
 * 2. Input mode: textarea for reason, "Skip with reason" button, cancel option
 *
 * The parent handles the mutation (marks step as 'skipped' with cant_perform_reason).
 */

import { useState } from 'react';
import { Ban } from 'lucide-react';

interface CantPerformFlowProps {
  onCantPerform: (reason: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const MAX_REASON_LENGTH = 200;

export function CantPerformFlow({
  onCantPerform,
  onCancel,
  isSubmitting,
}: CantPerformFlowProps) {
  const [showInput, setShowInput] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim() && !isSubmitting) {
      onCantPerform(reason.trim());
    }
  };

  const handleCancel = () => {
    setShowInput(false);
    setReason('');
    onCancel();
  };

  // Phase 1: Collapsed trigger
  if (!showInput) {
    return (
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="flex items-center gap-1 text-xs text-text-hint underline transition-colors active:text-text-secondary"
        >
          <Ban className="h-3 w-3" />
          Can't do this?
        </button>
      </div>
    );
  }

  // Phase 2: Expanded input
  return (
    <div className="rounded-xl border border-surface-secondary bg-surface-secondary/30 p-3 space-y-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
        placeholder="Why can't you perform this step?"
        rows={3}
        className="w-full resize-none rounded-lg border border-surface-secondary bg-surface p-2 text-sm text-text placeholder:text-text-hint focus:border-accent/50 focus:outline-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-hint">
          {reason.length}/{MAX_REASON_LENGTH}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!reason.trim() || isSubmitting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-warning/15 px-3 py-2 text-sm font-medium text-warning transition-colors active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Skipping...' : 'Skip with reason'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-2 text-sm text-text-hint transition-colors active:text-text-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
