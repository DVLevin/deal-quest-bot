/**
 * StepActionScreen -- full action screen for a single engagement plan step.
 *
 * Replaces the compact step row with a guided action experience showing:
 * - Step header with number, description, timing, and close button
 * - Lead context mini-card (name + company)
 * - Draft copy card (if suggested text exists)
 * - Screenshot upload section
 * - Done / Skip action buttons
 * - Can't-perform flow (progressive disclosure)
 *
 * Also renders completed/skipped state banners for non-pending steps.
 *
 * Pure presentational -- accepts all callbacks from the parent (LeadDetail).
 */

import { X, Check, SkipForward, Clock, RotateCcw, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import type { EngagementPlanStep } from '@/types/tables';
import { DraftCopyCard } from './DraftCopyCard';
import { ProofUpload } from './ProofUpload';
import { CantPerformFlow } from './CantPerformFlow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepActionScreenProps {
  step: EngagementPlanStep;
  leadName: string;
  leadCompany?: string;
  onComplete: () => void;
  onCantPerform: (reason: string) => void;
  onUploadProof: (file: File) => Promise<void>;
  onGenerateDraft: () => void;
  onClose: () => void;
  isUpdating: boolean;
  isUploading: boolean;
  isGeneratingDraft: boolean;
}

// ---------------------------------------------------------------------------
// StepActionScreen
// ---------------------------------------------------------------------------

export function StepActionScreen({
  step,
  leadName,
  leadCompany,
  onComplete,
  onCantPerform,
  onUploadProof,
  onGenerateDraft,
  onClose,
  isUpdating,
  isUploading,
  isGeneratingDraft,
}: StepActionScreenProps) {
  // -------------------------------------------------------------------------
  // Completed state banner
  // -------------------------------------------------------------------------
  if (step.status === 'done') {
    return (
      <div className="relative rounded-2xl border border-surface-secondary bg-surface p-4 shadow-lg space-y-4">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex items-center justify-center rounded-lg p-1 text-text-hint transition-colors active:bg-surface-secondary"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success banner */}
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-3">
          <Check className="h-5 w-5 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-success">Step completed</p>
            {step.completed_at && (
              <p className="text-xs text-success/70">
                {new Date(step.completed_at).toLocaleDateString()}
              </p>
            )}
          </div>
          {step.proof_url && (
            <img
              src={step.proof_url}
              alt="Screenshot"
              className="h-10 w-10 rounded object-cover"
            />
          )}
        </div>

        {/* Step description */}
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-bold text-success">
            {step.step_id}
          </span>
          <p className="text-sm text-text">{step.description}</p>
        </div>

        {/* Reopen option */}
        <button
          type="button"
          onClick={onComplete}
          disabled={isUpdating}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-2 text-sm font-medium text-text-secondary transition-colors active:scale-95 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reopen
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Skipped state banner
  // -------------------------------------------------------------------------
  if (step.status === 'skipped') {
    return (
      <div className="relative rounded-2xl border border-surface-secondary bg-surface p-4 shadow-lg space-y-4">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex items-center justify-center rounded-lg p-1 text-text-hint transition-colors active:bg-surface-secondary"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Skipped banner */}
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">Step skipped</p>
            {step.cant_perform_reason && (
              <p className="mt-1 text-xs text-text-secondary">
                {step.cant_perform_reason}
              </p>
            )}
          </div>
        </div>

        {/* Step description */}
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-text-hint/15 text-xs font-bold text-text-hint">
            {step.step_id}
          </span>
          <p className="text-sm text-text-secondary line-through">
            {step.description}
          </p>
        </div>

        {/* Reopen option */}
        <button
          type="button"
          onClick={onComplete}
          disabled={isUpdating}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-2 text-sm font-medium text-text-secondary transition-colors active:scale-95 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reopen
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Pending state -- full action screen
  // -------------------------------------------------------------------------
  return (
    <div className="relative rounded-2xl border border-surface-secondary bg-surface p-4 shadow-lg space-y-4">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 flex items-center justify-center rounded-lg p-1 text-text-hint transition-colors active:bg-surface-secondary"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Header: step number + description + timing */}
      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
          {step.step_id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{step.description}</p>
          {step.timing && (
            <div className="mt-1 flex items-center gap-1 text-xs text-text-hint">
              <Clock className="h-3 w-3" />
              {step.timing}
            </div>
          )}
        </div>
      </div>

      {/* Lead context mini-card */}
      <div className="rounded-lg bg-surface-secondary/50 px-3 py-2">
        <p className="text-xs text-text-hint">
          Lead:{' '}
          <span className="font-medium text-text-secondary">{leadName}</span>
          {leadCompany && (
            <>
              {' '}@ <span className="text-text-secondary">{leadCompany}</span>
            </>
          )}
        </p>
      </div>

      {/* Draft section */}
      {isGeneratingDraft ? (
        <div className="space-y-2 rounded-xl border border-surface-secondary bg-surface-secondary/30 p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            <span className="text-xs font-semibold text-text-secondary">Generating draft...</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded bg-surface-secondary" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface-secondary" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-surface-secondary" />
          </div>
        </div>
      ) : step.suggested_text ? (
        <DraftCopyCard draftText={step.suggested_text} />
      ) : (
        <p className="text-center text-xs text-text-hint">
          No draft available for this step
        </p>
      )}

      {/* Screenshot section */}
      <ProofUpload
        onUpload={onUploadProof}
        existingProofUrl={step.proof_url}
        isUploading={isUploading}
      />

      {/* Generate draft from screenshot button */}
      {step.proof_url && !isUploading && (
        <button
          type="button"
          onClick={onGenerateDraft}
          disabled={isGeneratingDraft}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 text-sm font-medium text-accent transition-colors active:scale-95 disabled:opacity-50"
        >
          {isGeneratingDraft ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing screenshot...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {step.suggested_text ? 'Regenerate from Screenshot' : 'Generate Draft from Screenshot'}
            </>
          )}
        </button>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onComplete}
          disabled={isUpdating}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2.5 text-sm font-semibold text-white transition-colors active:scale-95 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {isUpdating ? 'Updating...' : 'Mark Done'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isUpdating}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors active:scale-95 disabled:opacity-50"
        >
          <SkipForward className="h-4 w-4" />
          Skip
        </button>
      </div>

      {/* Can't perform flow */}
      <CantPerformFlow
        onCantPerform={onCantPerform}
        onCancel={() => {}}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
