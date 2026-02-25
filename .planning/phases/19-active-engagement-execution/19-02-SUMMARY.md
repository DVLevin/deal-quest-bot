---
phase: 19-active-engagement-execution
plan: 02
subsystem: tma-leads
tags: [react, components, engagement-plan, clipboard, file-upload]
depends_on:
  requires: [19-01]
  provides: [StepActionScreen, DraftCopyCard, ProofUpload, CantPerformFlow]
  affects: [19-03]
tech-stack:
  added: []
  patterns: [progressive-disclosure, clipboard-fallback, file-upload-ref]
key-files:
  created:
    - packages/webapp/src/features/leads/components/StepActionScreen.tsx
    - packages/webapp/src/features/leads/components/DraftCopyCard.tsx
    - packages/webapp/src/features/leads/components/ProofUpload.tsx
    - packages/webapp/src/features/leads/components/CantPerformFlow.tsx
  modified:
    - packages/webapp/src/features/leads/hooks/useUploadProof.ts
decisions:
  - id: 19-02-01
    description: "Clipboard fallback copied as module-level util into DraftCopyCard (same pattern as LeadDetail)"
  - id: 19-02-02
    description: "ProofUpload uses file input without capture='camera' (Telegram Android WebView compat)"
  - id: 19-02-03
    description: "CantPerformFlow uses progressive disclosure: collapsed link -> expanded textarea -> submit"
  - id: 19-02-04
    description: "StepActionScreen renders three distinct layouts for pending/done/skipped states"
metrics:
  duration: 3m
  completed: 2026-02-07
---

# Phase 19 Plan 02: Step Action Screen Components Summary

Four presentational React components for the step action screen, transforming compact step rows into guided action experiences.

## What Was Built

### DraftCopyCard (103 lines)
Displays draft message text with one-tap copy to clipboard. Uses the Telegram WebView clipboard fallback pattern (navigator.clipboard with textarea+execCommand fallback). Shows "Draft Message" header with inline copy icon, pre-formatted text body, and full-width "Copy Draft" button with 2-second "Copied!" feedback state.

### ProofUpload (100 lines)
Screenshot upload component with three visual states:
1. Empty: dashed-border upload area with Camera icon
2. Uploading: spinner with "Uploading..." text (button disabled)
3. Proof exists: green success bar with CheckCircle, thumbnail preview, and "Replace" button

Uses hidden `<input type="file" accept="image/*">` triggered via ref. Does NOT use `capture="camera"` per research findings about Telegram Android WebView compatibility.

### CantPerformFlow (94 lines)
Progressive disclosure flow for skipping a step with a reason:
1. Collapsed: subtle "Can't do this?" underlined link with Ban icon
2. Expanded: textarea (200 char max) + "Skip with reason" button (warning styling) + Cancel

### StepActionScreen (255 lines)
Main composition component that assembles all sub-components into a guided action experience:
- **Pending state**: Header (step badge, description, timing), lead context mini-card, DraftCopyCard or "No draft" hint, ProofUpload, Done/Skip action buttons, CantPerformFlow
- **Done state**: Green success banner with completion date and proof thumbnail, step description, Reopen button
- **Skipped state**: Warning banner with cant_perform_reason, strikethrough description, Reopen button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useUploadProof getPublicUrl return type**
- **Found during:** Task 1
- **Issue:** `useUploadProof.ts` line 113 destructured `{ data: urlData }` from `getPublicUrl()`, but InsForge SDK's `getPublicUrl()` returns `string` directly, not `{ data: { publicUrl: string } }`
- **Fix:** Changed to `const publicUrl = getInsforge().storage.from('prospect-photos').getPublicUrl(key)` and updated the null check and return
- **Files modified:** `packages/webapp/src/features/leads/hooks/useUploadProof.ts`
- **Commit:** da089b7

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 19-02-01 | Clipboard fallback as module-level util in DraftCopyCard | Same pattern as LeadDetail, avoids cross-component import coupling |
| 19-02-02 | No capture="camera" on file input | Research identified Telegram Android WebView breakage |
| 19-02-03 | Progressive disclosure for CantPerformFlow | Reduces visual noise -- most users complete steps, skip flow is secondary |
| 19-02-04 | Three distinct layouts for step states | Done/skipped steps show summary banners instead of full action UI |

## Verification

- `npx tsc --noEmit` passes with zero errors
- Four new component files exist in `packages/webapp/src/features/leads/components/`
- StepActionScreen imports and renders DraftCopyCard, ProofUpload, CantPerformFlow
- DraftCopyCard uses clipboard fallback pattern (navigator.clipboard + execCommand)
- ProofUpload uses `<input type="file" accept="image/*">` without capture
- CantPerformFlow has progressive disclosure (collapsed -> expanded -> submit)
- All line count minimums exceeded (255, 103, 100, 94 vs required 80, 30, 40, 30)

## Next Phase Readiness

Plan 19-03 can now integrate StepActionScreen into LeadDetail. All four components are pure presentational with callback-based props, ready for composition.
