/**
 * StepActionScreen -- full action screen for a single engagement plan step.
 *
 * Replaces the compact step row with a guided action experience showing:
 * - Step header with number, description, timing, and close button
 * - Lead context mini-card (name + company)
 * - Draft copy card with tabbed options (or legacy text fallback)
 * - Screenshot upload section
 * - Done / Skip action buttons with post-copy nudge
 * - Can't-perform flow (progressive disclosure)
 *
 * Also renders completed/skipped state banners for non-pending steps.
 *
 * Pure presentational -- accepts all callbacks from the parent (LeadDetail).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Check, SkipForward, Clock, RotateCcw, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import type { EngagementPlanStep } from '@/types/tables';
import { useToast } from '@/shared/stores/toastStore';
import type { DraftResult } from '../hooks/useGenerateDraft';
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
  onGenerateDraft: (instructions?: string) => void;
  onClose: () => void;
  isUpdating: boolean;
  isUploading: boolean;
  isGeneratingDraft: boolean;
  draftResult?: DraftResult | null;
  previousDraftResult?: DraftResult | null;
  onUndoRegenerate?: () => void;
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
  draftResult,
  previousDraftResult,
  onUndoRegenerate,
}: StepActionScreenProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState('');
  const [showInstructionInput, setShowInstructionInput] = useState(false);

  const handleDraftCopy = useCallback((_text: string) => {
    setHasCopied(true);
    toast({
      type: 'success',
      message: 'Draft copied to clipboard!',
      action: {
        label: 'Done -- I posted it',
        onClick: onComplete,
      },
      duration: 8000,
    });
  }, [toast, onComplete]);

  const handleRegenerate = useCallback(() => {
    onGenerateDraft(regenInstructions.trim() || undefined);
    setRegenInstructions('');
    setShowInstructionInput(false);
  }, [onGenerateDraft, regenInstructions]);

  // Undo toast on regeneration completion
  const prevDraftResultRef = useRef(draftResult);

  useEffect(() => {
    if (
      draftResult &&
      previousDraftResult &&
      draftResult !== prevDraftResultRef.current
    ) {
      toast({
        type: 'info',
        message: 'Draft regenerated',
        action: {
          label: 'Undo',
          onClick: () => onUndoRegenerate?.(),
        },
        duration: 6000,
      });
    }
    prevDraftResultRef.current = draftResult;
  }, [draftResult, previousDraftResult, toast, onUndoRegenerate]);

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
      ) : draftResult?.options ? (
        <DraftCopyCard
          options={draftResult.options}
          platform={draftResult.platform}
          onCopy={handleDraftCopy}
          onRegenerate={step.proof_url ? handleRegenerate : undefined}
          isRegenerating={isGeneratingDraft}
        />
      ) : step.suggested_text ? (
        <DraftCopyCard
          draftText={step.suggested_text}
          onCopy={handleDraftCopy}
        />
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
        <div className="space-y-2">
          {/* Instruction input (shown when regenerating) */}
          {showInstructionInput && (draftResult || step.suggested_text) && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-2">
              <label className="text-xs font-medium text-text-secondary">
                Regeneration instructions (optional)
              </label>
              <textarea
                value={regenInstructions}
                onChange={(e) => setRegenInstructions(e.target.value)}
                placeholder="e.g. Make it shorter, more casual, focus on their recent post about AI..."
                className="w-full rounded-lg border border-surface-secondary bg-surface px-3 py-2 text-sm text-text placeholder:text-text-hint focus:border-accent focus:outline-none resize-none"
                rows={2}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-hint">{regenInstructions.length}/500</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowInstructionInput(false); setRegenInstructions(''); }}
                    className="rounded-md px-3 py-1 text-xs font-medium text-text-hint"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isGeneratingDraft}
                    className="flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {isGeneratingDraft ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main generate/regenerate button */}
          <button
            type="button"
            onClick={() => {
              if (draftResult || step.suggested_text) {
                // For regeneration, show instruction input first
                if (!showInstructionInput) {
                  setShowInstructionInput(true);
                } else {
                  handleRegenerate();
                }
              } else {
                // First generation -- no instructions needed
                onGenerateDraft();
              }
            }}
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
                {draftResult || step.suggested_text ? 'Regenerate from Screenshot' : 'Generate Draft from Screenshot'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onComplete}
          disabled={isUpdating}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2.5 text-sm font-semibold text-white transition-colors active:scale-95 disabled:opacity-50 ${
            hasCopied ? 'ring-2 ring-success/40 animate-pulse' : ''
          }`}
        >
          <Check className="h-4 w-4" />
          {isUpdating ? 'Updating...' : hasCopied ? 'Done -- I posted it' : 'Mark Done'}
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
