# Phase 19: Active Engagement Execution - Research

**Researched:** 2026-02-07
**Domain:** TMA action screens, file upload in Telegram WebView, InsForge Storage, engagement plan schema evolution
**Confidence:** HIGH

## Summary

This phase transforms the TMA's engagement plan from a passive checklist into guided step-by-step action screens. The core technical challenges are: (1) building a full action screen within the existing lead detail routing, (2) uploading proof-of-action screenshots from the Telegram WebView to InsForge Storage, (3) implementing a "can't perform" flow that records reasons and optionally triggers alternative suggestions, (4) reliable clipboard copy for draft text, and (5) extending bot deep links to target specific action screens.

The existing infrastructure is solid. Phase 16 already built LeadDetail with collapsible sections, step highlighting via `?step=` query params, and deep link coordination. Phase 14 built reminder messages with Done/Snooze/Skip inline buttons. Phase 15.1 built three-state step toggling (pending/done/skipped). The InsForge SDK (`@insforge/sdk`) already has a `Storage` module with `upload()` and `uploadAuto()` methods for client-side file uploads, and the bot already uses a `prospect-photos` storage bucket. The engagement_plan JSONB already includes `suggested_text` per step.

**Primary recommendation:** Extend the existing `/leads/:leadId?step=:stepId` route to render a dedicated action screen (full-width overlay or expanded view) instead of just highlighting. Use the InsForge SDK's `storage.from('proof-screenshots').upload()` for client-side image upload. Store proof URLs and can't-perform reasons directly in the engagement_plan JSONB step objects rather than creating new tables.

## Standard Stack

### Core (already installed, no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @insforge/sdk | latest | Storage upload (proof screenshots) | Already in project, has `Storage.from().upload()` API |
| @tanstack/react-query | ^5.90.0 | Data fetching, mutation, cache invalidation | Already in project, all hooks follow this pattern |
| react-router | ^7.12.0 | Route params + query params for step targeting | Already in project, `/leads/:leadId?step=:stepId` exists |
| lucide-react | ^0.562.0 | Icons for action screen UI | Already in project |
| zustand | ^5.0.10 | Auth store for telegram_id | Already in project |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | ^4.1.0 | Styling action screens | All UI components |
| @telegram-apps/sdk-react | ^3.3.9 | Telegram WebApp integration | Deep link handling |

### No New Dependencies Needed
The entire phase can be built with the existing stack. No new packages required.

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Recommended Approach: Expanded Step View Within LeadDetail

Rather than a separate route or modal, the action screen should be an expanded state within the existing LeadDetail component. When `?step=X` is present (or a step is tapped), the step row expands from a compact list item into a full action card with:
- Lead context summary (name, company, title)
- Step instructions and timing
- Draft copy with one-tap copy button
- Screenshot upload area
- Done / Can't Perform buttons

This avoids routing complexity, preserves back-button behavior, and keeps the context visible.

### Recommended Project Structure
```
src/features/leads/
├── components/
│   ├── LeadDetail.tsx          # Modified: step expand logic, action mode
│   ├── StepActionScreen.tsx    # NEW: expanded action view for a single step
│   ├── ProofUpload.tsx         # NEW: screenshot upload component
│   ├── CantPerformFlow.tsx     # NEW: reason input + skip/alternative
│   ├── DraftCopyCard.tsx       # NEW: draft text display with copy button
│   ├── LeadCard.tsx            # Existing
│   ├── LeadList.tsx            # Existing
│   ├── LeadNotes.tsx           # Existing
│   ├── LeadStatusSelector.tsx  # Existing
│   └── ActivityTimeline.tsx    # Existing
├── hooks/
│   ├── useUploadProof.ts       # NEW: InsForge storage upload mutation
│   ├── useCantPerform.ts       # NEW: mark step can't-perform + reason
│   ├── useUpdatePlanStep.ts    # MODIFIED: add proof_url and cant_perform_reason support
│   ├── useLead.ts              # Existing
│   ├── useLeads.ts             # Existing
│   ├── useTodayActions.ts      # Existing
│   └── useLeadReminders.ts    # Existing
└── types.ts                    # MODIFIED: EngagementPlanStep extended
```

### Pattern 1: Step Action Screen (Expanded Step)
**What:** When a step is activated (via tap or deep link `?step=X`), it expands from a list item into a full action card showing all context and action controls.
**When to use:** Always when user engages with a specific step.
**Example:**
```typescript
// In LeadDetail.tsx -- expanded step state
const [activeStep, setActiveStep] = useState<number | null>(highlightStepId);

// When activeStep is set, render StepActionScreen instead of compact row
{activeStep === step.step_id ? (
  <StepActionScreen
    step={step}
    lead={lead}
    onComplete={() => handleStepComplete(step.step_id)}
    onCantPerform={(reason) => handleCantPerform(step.step_id, reason)}
    onClose={() => setActiveStep(null)}
  />
) : (
  <CompactStepRow step={step} onTap={() => setActiveStep(step.step_id)} />
)}
```

### Pattern 2: Client-Side InsForge Storage Upload
**What:** Upload proof screenshots directly from TMA to InsForge storage using the SDK.
**When to use:** When user takes a screenshot of completed action.
**Example:**
```typescript
// Source: InsForge SDK docs + existing bot upload pattern
const insforge = getInsforge();

async function uploadProof(file: File, leadId: number, stepId: number): Promise<string> {
  const key = `proof/${leadId}/${stepId}/${Date.now()}_${file.name}`;
  const { data, error } = await insforge.storage
    .from('proof-screenshots')
    .upload(key, file);
  if (error) throw error;
  // Always use the returned key/url as backend may auto-rename
  return data.url;
}
```

### Pattern 3: JSONB Schema Extension (No Migration Needed)
**What:** Add optional fields to engagement_plan step objects. Since engagement_plan is JSONB, no migration is required.
**When to use:** To store proof_url, cant_perform_reason, and alternative_action per step.
**Example:**
```typescript
interface EngagementPlanStep {
  step_id: number;
  description: string;
  timing: string;
  status: PlanStepStatus;    // 'pending' | 'done' | 'skipped' | 'cant_perform'
  suggested_text?: string;   // Draft copy (already exists)
  completed_at?: string | null;
  // NEW fields for Phase 19:
  proof_url?: string;        // Screenshot proof URL from InsForge storage
  cant_perform_reason?: string;
  alternative_action?: string; // AI-suggested alternative (optional)
}
```

### Pattern 4: HTML File Input for Image Upload
**What:** Use standard `<input type="file" accept="image/*">` for screenshot selection.
**When to use:** For proof-of-action upload. Works on both Android and iOS Telegram WebView.
**Example:**
```typescript
// Standard HTML file input -- works in Telegram WebView on both platforms
<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }}
  className="hidden"
  ref={fileInputRef}
/>
<button onClick={() => fileInputRef.current?.click()}>
  Upload Screenshot
</button>
```

### Anti-Patterns to Avoid
- **Separate route for action screen:** Don't create `/leads/:id/steps/:stepId` -- this breaks back-button navigation and loses the plan overview context. Keep it within LeadDetail.
- **Base64 in JSONB:** Don't store screenshot data as base64 in the engagement_plan JSONB. Use InsForge storage and store only the URL.
- **New database table for proof:** Don't create a separate `step_proofs` table. The JSONB approach (proof_url in each step) is simpler and co-located with the data.
- **navigator.clipboard.writeText only:** Don't rely solely on the Clipboard API. The existing fallback pattern (textarea + execCommand) already in LeadDetail.tsx handles WebView restrictions correctly.
- **Camera API (getUserMedia):** Don't try to access the camera directly via `navigator.mediaDevices.getUserMedia()` -- this has known issues in Telegram Android WebView. The file input approach (`accept="image/*"`) triggers the OS photo picker which includes camera option.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to storage | Custom HTTP upload | InsForge SDK `storage.from().upload()` | SDK handles auth, presigned URLs, error handling |
| Clipboard copy | Custom clipboard manager | Existing `copyToClipboard()` in LeadDetail.tsx | Already handles WebView fallback with textarea+execCommand |
| Image resizing client-side | Canvas-based resizer | Upload as-is, rely on display CSS | Proof screenshots don't need vision model preprocessing |
| Step status sync | Custom dual-table sync | Extend existing `useUpdatePlanStep` hook | Already handles engagement_plan JSONB + scheduled_reminders sync |
| Toast notifications | Custom notification system | Existing `useToast()` from toastStore | Already used in all mutations |
| Optimistic updates | Manual cache manipulation | Extend existing onMutate/onError in useUpdatePlanStep | Pattern already established |
| Deep link step targeting | New deep link system | Existing `?step=X` query param + highlight logic | Phase 16 already built this |

**Key insight:** This phase is fundamentally about enhancing existing components, not building new infrastructure. The LeadDetail, step toggling, deep linking, storage upload -- all foundations exist. The work is to expand step rows into rich action screens and add proof/can't-perform flows.

## Common Pitfalls

### Pitfall 1: File Input Not Working in Some Telegram Versions
**What goes wrong:** `<input type="file">` may have inconsistent behavior across Telegram WebView versions on Android.
**Why it happens:** Telegram's WebView uses different chromium versions across platforms and app versions.
**How to avoid:** Use `accept="image/*"` (not `capture="camera"`), test on both iOS and Android. Add a graceful fallback message if file selection fails.
**Warning signs:** File input click does nothing, or only shows gallery without camera option.

### Pitfall 2: Clipboard Write Permission Denied
**What goes wrong:** `navigator.clipboard.writeText()` throws `NotAllowError: Write permission denied` in Telegram WebView.
**Why it happens:** Telegram WebView restricts clipboard write access for security. The Telegram API only provides `readTextFromClipboard`, not write.
**How to avoid:** The existing `copyToClipboard()` function in LeadDetail.tsx already handles this with the textarea+execCommand fallback. Reuse this exact pattern in DraftCopyCard.
**Warning signs:** Copy button appears to work but text is not actually in clipboard.

### Pitfall 3: JSONB Field Access Without Null Guards
**What goes wrong:** Adding new optional fields to JSONB step objects causes runtime errors when reading old steps that don't have the fields.
**Why it happens:** Existing engagement_plan steps were created without proof_url, cant_perform_reason, etc.
**How to avoid:** The `parseEngagementPlan()` function in types.ts already handles this with typeof guards. Extend it to also parse the new fields with the same defensive pattern.
**Warning signs:** TypeError on accessing `.proof_url` of undefined when viewing leads created before Phase 19.

### Pitfall 4: Large Image Uploads Timing Out
**What goes wrong:** User uploads a full-resolution photo (5+ MB) and the InsForge storage upload times out or fails silently.
**Why it happens:** Mobile screenshots can be quite large on high-DPI displays. InsForge storage may have upload size limits.
**How to avoid:** Client-side compression before upload using canvas resize (max 1200px). Show upload progress indicator. Set reasonable timeout.
**Warning signs:** Upload spinner never completes, silent failure with no error toast.

### Pitfall 5: Step Status Enum Not Extended
**What goes wrong:** Using 'cant_perform' as a status value but PlanStepStatus type only allows 'pending' | 'done' | 'skipped'.
**Why it happens:** TypeScript type needs updating alongside the logic.
**How to avoid:** Either extend PlanStepStatus to include 'cant_perform', or treat can't-perform as a variant of 'skipped' (with reason stored separately). Recommend: keep as 'skipped' with cant_perform_reason field to minimize type changes across the stack.
**Warning signs:** TypeScript errors when assigning 'cant_perform' to status field.

### Pitfall 6: Deep Link Doesn't Auto-Expand Step
**What goes wrong:** Bot reminder deep link opens LeadDetail and highlights the step, but doesn't expand it into action mode.
**Why it happens:** Current `?step=X` only scrolls and highlights -- it doesn't trigger the expanded action view.
**How to avoid:** Update the highlightStepId effect to also set activeStep, so the step auto-expands into action mode when arriving via deep link.
**Warning signs:** User taps "Open in App" from bot reminder and sees the step list (not the action screen).

## Code Examples

### 1. InsForge Client-Side Storage Upload Hook
```typescript
// Source: InsForge SDK types + existing useUpdatePlanStep pattern
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

interface UploadProofVars {
  file: File;
  leadId: number;
  stepId: number;
  telegramId: number;
}

export function useUploadProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, leadId, stepId }: UploadProofVars) => {
      const key = `proof/${leadId}/${stepId}/${Date.now()}.jpg`;
      const { data, error } = await getInsforge()
        .storage.from('proof-screenshots')
        .upload(key, file);
      if (error) throw error;

      // Update engagement_plan JSONB to include proof_url
      const { data: leadData, error: fetchErr } = await getInsforge()
        .database.from('lead_registry')
        .select('engagement_plan')
        .eq('id', leadId)
        .single();
      if (fetchErr) throw fetchErr;

      const plan = (leadData?.engagement_plan ?? []) as EngagementPlanStep[];
      const updatedPlan = plan.map((s) =>
        s.step_id === stepId ? { ...s, proof_url: data.url } : s
      );

      const { error: updateErr } = await getInsforge()
        .database.from('lead_registry')
        .update({
          engagement_plan: updatedPlan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
      if (updateErr) throw updateErr;

      return data.url;
    },
    onSettled: (_d, _e, { leadId, telegramId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.byUser(telegramId) });
    },
  });
}
```

### 2. File Input Component for Telegram WebView
```typescript
// Source: Standard HTML5 file input, verified for Telegram WebView compatibility
import { useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle } from 'lucide-react';

interface ProofUploadProps {
  onUpload: (file: File) => Promise<void>;
  existingProofUrl?: string;
  isUploading: boolean;
}

export function ProofUpload({ onUpload, existingProofUrl, isUploading }: ProofUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onUpload(file);
        }}
      />
      {existingProofUrl ? (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm text-success">Proof uploaded</span>
          <img src={existingProofUrl} alt="Proof" className="ml-auto h-10 w-10 rounded object-cover" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 py-4 text-sm font-medium text-accent transition-colors active:bg-accent/10"
        >
          {isUploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
          ) : (
            <><Camera className="h-4 w-4" /> Upload Proof Screenshot</>
          )}
        </button>
      )}
    </div>
  );
}
```

### 3. Clipboard Copy (Reusing Existing Pattern)
```typescript
// Source: Existing copyToClipboard() from LeadDetail.tsx line 64-85
// This exact pattern already handles WebView clipboard restrictions
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for Telegram WebView where Clipboard API is restricted
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
```

### 4. Extended EngagementPlanStep Parser
```typescript
// Source: Existing parseEngagementPlan() in types.ts, extended
export function parseEngagementPlan(plan: unknown): EngagementPlanStep[] {
  if (!Array.isArray(plan)) return [];
  return plan
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      step_id: typeof item.step_id === 'number' ? item.step_id : 0,
      description: parseStringField(item.description, ''),
      timing: parseStringField(item.timing, ''),
      status:
        item.status === 'done'
          ? ('done' as const)
          : item.status === 'skipped'
            ? ('skipped' as const)
            : ('pending' as const),
      suggested_text:
        typeof item.suggested_text === 'string' ? item.suggested_text : undefined,
      completed_at:
        typeof item.completed_at === 'string' ? item.completed_at : null,
      // Phase 19 new fields -- all optional, defensive parsing
      proof_url:
        typeof item.proof_url === 'string' ? item.proof_url : undefined,
      cant_perform_reason:
        typeof item.cant_perform_reason === 'string' ? item.cant_perform_reason : undefined,
      alternative_action:
        typeof item.alternative_action === 'string' ? item.alternative_action : undefined,
    }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Step list with toggle (Phase 16) | Expanded action screens per step | Phase 19 | Steps become actionable, not just checkable |
| Bot-only proof (screenshot to bot) | TMA direct upload to storage | Phase 19 | Proof captured in-context, no app switching |
| Binary Done/Skip | Done / Can't Perform (with reason) / Skip | Phase 19 | Better data on why steps fail |
| Deep link highlights step | Deep link opens step action screen | Phase 19 | Immediate action from notification |

**Not changing (keep as-is):**
- Three-state toggle (pending/done/skipped) remains for quick toggling from collapsed view
- Bot reminder messages keep their existing Done/Snooze/Skip inline buttons
- TodayActionsCard dashboard widget navigates to step (but now it opens action mode)

## Open Questions

1. **Storage bucket creation**
   - What we know: Bot uses `prospect-photos` bucket. InsForge SDK has `storage.from(bucketName)`.
   - What's unclear: Whether a `proof-screenshots` bucket exists or needs to be created via InsForge dashboard. Whether the anon key has upload permissions.
   - Recommendation: Try uploading to existing `prospect-photos` bucket first with a `proof/` key prefix. If that fails, create a new bucket via InsForge dashboard.

2. **AI alternative suggestions for can't-perform**
   - What we know: EngagementService has `generate_advice()` that could be adapted. LLM calls require API key and provider setup.
   - What's unclear: Whether to generate alternatives on the TMA side (would need user's API key exposure) or via bot.
   - Recommendation: For v1, use a simple template-based approach (skip with reason recorded). AI alternatives can be a future enhancement triggered via bot deep link ("Get Alternative" opens bot chat).

3. **Upload size limits**
   - What we know: Bot pre-resizes to 1568px max for vision models. InsForge storage upload size limits are unknown.
   - What's unclear: Maximum file size for InsForge storage uploads, and whether client-side compression is needed.
   - Recommendation: Implement client-side canvas resize to 1200px max dimension before upload. This keeps files under 500KB typically.

4. **Can't-perform status representation**
   - What we know: Current PlanStepStatus is 'pending' | 'done' | 'skipped'. Adding a 4th status requires changes across bot + TMA.
   - What's unclear: Whether the bot-side handlers need to understand 'cant_perform' status.
   - Recommendation: Treat can't-perform as a variant of 'skipped' (status = 'skipped', cant_perform_reason is non-null). This avoids schema changes and bot-side updates.

## Sources

### Primary (HIGH confidence)
- InsForge SDK `@insforge/sdk` dist/index.d.ts -- Storage, StorageBucket, upload(), uploadAuto() methods verified from installed package
- Existing codebase: LeadDetail.tsx, useUpdatePlanStep.ts, types.ts, plan_scheduler.py, reminders.py -- all current patterns verified from source
- InsForge Python client `insforge_client.py` -- upload_file() and get_file_url() methods for `prospect-photos` bucket

### Secondary (MEDIUM confidence)
- [Telegram Mini Apps official docs](https://core.telegram.org/bots/webapps) -- File input works in WebView, clipboard write restricted, deep link format confirmed
- [InsForge Storage SDK docs](https://docs.insforge.dev/core-concepts/storage/sdk) -- upload(), uploadAuto(), from() bucket API confirmed
- [Telegram Mini Apps tma.js issue #681](https://github.com/Telegram-Mini-Apps/telegram-apps/issues/681) -- Android camera via file input works with `accept="image/*"`

### Tertiary (LOW confidence)
- [Telegram desktop clipboard issue #27381](https://github.com/telegramdesktop/tdesktop/issues/27381) -- Was marked completed in 2024, exact current state unclear
- WebSearch results on Telegram WebView file upload support -- multiple sources agree `<input type="file">` works

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use, no new dependencies
- Architecture: HIGH -- extends established patterns from Phases 14, 15.1, 16
- Pitfalls: HIGH -- identified from actual codebase analysis and known Telegram WebView limitations
- Storage upload: MEDIUM -- InsForge SDK has the API, but bucket permissions and size limits not verified
- Can't-perform flow: MEDIUM -- design decision (template vs AI) not validated with user

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- no fast-moving dependencies)
