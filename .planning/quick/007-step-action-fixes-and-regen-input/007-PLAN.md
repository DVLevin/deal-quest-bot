---
phase: quick-007
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts
  - packages/webapp/src/features/leads/hooks/useGenerateDraft.ts
  - packages/webapp/src/features/leads/components/LeadDetail.tsx
  - packages/webapp/src/features/leads/components/StepActionScreen.tsx
  - packages/webapp/src/features/leads/components/DraftCopyCard.tsx
  - bot/services/draft_poller.py
  - bot/agents/comment_generator.py
  - bot/storage/models.py
  - insforge/migrations/008_draft_requests_user_instructions.sql
autonomous: true
must_haves:
  truths:
    - "Step complete/skip/upload errors show specific failure reason with retry button"
    - "Orphaned screenshots are retried automatically when step update fails after upload"
    - "Draft generation errors distinguish between insert failure, timeout, and bot processing failure"
    - "User can type custom instructions before regenerating a draft (e.g. shorter, more casual)"
    - "User instructions are passed through draft_requests table to CommentGeneratorAgent"
    - "LinkedIn connection request drafts show a character counter with 200-char cap warning"
  artifacts:
    - path: "packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts"
      provides: "Improved error messages with specific failure context"
    - path: "packages/webapp/src/features/leads/hooks/useGenerateDraft.ts"
      provides: "userInstructions parameter in GenerateDraftVars, passed to draft_requests insert"
    - path: "packages/webapp/src/features/leads/components/StepActionScreen.tsx"
      provides: "Text input for regeneration instructions, LinkedIn char counter display"
    - path: "packages/webapp/src/features/leads/components/DraftCopyCard.tsx"
      provides: "Character counter for LinkedIn connection_request drafts"
    - path: "packages/webapp/src/features/leads/components/LeadDetail.tsx"
      provides: "Wires userInstructions through handleGenerateDraft, improved error toasts with retry"
    - path: "bot/services/draft_poller.py"
      provides: "Passes user_instructions from draft request to agent input context"
    - path: "bot/agents/comment_generator.py"
      provides: "Incorporates user_instructions into LLM prompt when present"
    - path: "insforge/migrations/008_draft_requests_user_instructions.sql"
      provides: "user_instructions TEXT column on draft_requests table"
  key_links:
    - from: "StepActionScreen.tsx"
      to: "LeadDetail.tsx"
      via: "onGenerateDraft callback now accepts optional string param"
      pattern: "onGenerateDraft\\(.*instructions"
    - from: "LeadDetail.tsx"
      to: "useGenerateDraft.ts"
      via: "draftMutation.mutate with userInstructions"
      pattern: "userInstructions"
    - from: "useGenerateDraft.ts"
      to: "draft_requests table"
      via: "insert with user_instructions column"
      pattern: "user_instructions"
    - from: "draft_poller.py"
      to: "comment_generator.py"
      via: "agent_input context includes user_instructions"
      pattern: "user_instructions"
---

<objective>
Fix three step action bugs (complete step, upload proof + update, draft generation) with specific error messages and retry affordances, add user instruction input for draft regeneration, and add LinkedIn 200-char cap indicator.

Purpose: Users currently see generic "Failed to..." errors with no way to understand or recover from failures. Draft regeneration has no way to steer output. LinkedIn invite drafts exceed the 200-char limit.

Output: Resilient step actions with descriptive errors + retry, regeneration with custom instructions end-to-end (TMA -> DB -> Bot -> Agent), LinkedIn character counter.
</objective>

<execution_context>
@/Users/dmytrolevin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/dmytrolevin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts
@packages/webapp/src/features/leads/hooks/useGenerateDraft.ts
@packages/webapp/src/features/leads/hooks/useUploadProof.ts
@packages/webapp/src/features/leads/components/StepActionScreen.tsx
@packages/webapp/src/features/leads/components/LeadDetail.tsx
@packages/webapp/src/features/leads/components/DraftCopyCard.tsx
@bot/services/draft_poller.py
@bot/agents/comment_generator.py
@bot/storage/models.py
@bot/storage/repositories.py
@insforge/migrations/006_draft_requests.sql
@prompts/comment_generator_agent.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix error handling in step mutations and upload-then-update flow</name>
  <files>
    packages/webapp/src/features/leads/hooks/useUpdatePlanStep.ts
    packages/webapp/src/features/leads/components/LeadDetail.tsx
  </files>
  <action>
**useUpdatePlanStep.ts -- Add specific error messages at each failure point:**

In the `mutationFn`, replace generic `throw fetchError` / `throw updateError` / `throw activityError` with wrapped errors that include context:
- Line 69 (`if (fetchError) throw fetchError`): Replace with `throw new Error(\`Failed to load lead data: ${fetchError.message}\`)`
- Line 100 (`if (updateError) throw updateError`): Replace with `throw new Error(\`Failed to save step update: ${updateError.message}\`)`
- Line 136 (`if (activityError) throw activityError`): Replace with `throw new Error(\`Step updated but activity log failed: ${activityError.message}\`)`. Note: For this last one, the step IS updated -- the activity log is secondary. Consider catching and logging this error as a warning rather than throwing, so the UI doesn't report failure when the step was actually saved. Change to: `console.warn('Activity log insert failed:', activityError)` (do NOT throw -- the step update already succeeded).

**LeadDetail.tsx -- Improve error handlers with specific messages and retry:**

1. `handleStepComplete` (line 521-539): In `onError` callback, extract the error message:
```typescript
onError: (err: unknown) => {
  const msg = err instanceof Error ? err.message : 'Failed to complete step';
  toast({
    type: 'error',
    message: msg,
    action: { label: 'Retry', onClick: () => handleStepComplete(stepId) },
  });
},
```

2. `handleCantPerform` (line 542-558): Same pattern -- extract error message, add retry:
```typescript
onError: (err: unknown) => {
  const msg = err instanceof Error ? err.message : 'Failed to skip step';
  toast({
    type: 'error',
    message: msg,
    action: { label: 'Retry', onClick: () => handleCantPerform(stepId, reason) },
  });
},
```

3. `handleUploadProof` (line 561-588): Fix the orphan screenshot problem. When upload succeeds but step update fails, retry the step update (not the whole upload). Change the inner `stepMutation.mutate` `onError`:
```typescript
onError: () => {
  toast({
    type: 'error',
    message: 'Screenshot saved but failed to link it to the step',
    action: {
      label: 'Retry linking',
      onClick: () => {
        stepMutation.mutate(
          { leadId: lead.id, stepId, newStatus: 'pending', telegramId, proofUrl: publicUrl },
          {
            onSuccess: () => toast({ type: 'success', message: 'Screenshot linked!' }),
            onError: () => toast({ type: 'error', message: 'Still failed to link screenshot. Try again later.' }),
          },
        );
      },
    },
    duration: 10000,
  });
},
```
This uses the `publicUrl` from the closure to retry just the step update, not re-upload.

4. `handleGenerateDraft` (line 590-627): Improve error with retry:
```typescript
onError: (err: unknown) => {
  const msg = err instanceof Error ? err.message : 'Failed to generate draft';
  toast({
    type: 'error',
    message: msg,
    action: { label: 'Try again', onClick: () => handleGenerateDraft(stepId) },
  });
},
```

5. `handleStepToggle` (line 477-519): Already has retry via `onClick: () => handleStepToggle(stepId, currentStatus)` -- just improve the error message extraction to use `err` parameter:
```typescript
onError: (err: unknown) => {
  const msg = err instanceof Error ? err.message : 'Failed to update step';
  toast({
    type: 'error',
    message: msg,
    action: { label: 'Retry', onClick: () => handleStepToggle(stepId, currentStatus) },
  });
},
```
  </action>
  <verify>
Run `cd /Users/dmytrolevin/Downloads/GD_playground/packages/webapp && npx tsc --noEmit` -- no type errors. Manually verify that each error handler in LeadDetail.tsx extracts error messages and provides a retry action.
  </verify>
  <done>
All step mutation errors show specific messages (not generic "Failed to..."). Upload-then-update failures provide "Retry linking" that retries only the step update with the already-uploaded URL. Activity log failures don't block step completion. Each error toast has a retry button.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add user instructions for draft regeneration (full stack)</name>
  <files>
    insforge/migrations/008_draft_requests_user_instructions.sql
    packages/webapp/src/features/leads/hooks/useGenerateDraft.ts
    packages/webapp/src/features/leads/components/StepActionScreen.tsx
    packages/webapp/src/features/leads/components/LeadDetail.tsx
    bot/storage/models.py
    bot/services/draft_poller.py
    bot/agents/comment_generator.py
  </files>
  <action>
**Migration -- insforge/migrations/008_draft_requests_user_instructions.sql:**
```sql
-- Add user_instructions column for regeneration with custom instructions
ALTER TABLE draft_requests ADD COLUMN user_instructions TEXT DEFAULT NULL;
```
Note: This migration must be run manually via InsForge dashboard. Include a comment at the top reminding of this.

**useGenerateDraft.ts -- Add userInstructions to the mutation:**

1. Add `userInstructions?: string` to the `GenerateDraftVars` interface (after `webResearch`).

2. In the `mutationFn`, include `user_instructions` in the insert call (after `status: 'pending'`):
```typescript
user_instructions: userInstructions || null,
```

This is backward compatible -- existing calls without `userInstructions` will insert NULL.

**StepActionScreen.tsx -- Add instruction input UI:**

1. Add to imports: `import { useState } from 'react'` (already imported), add `MessageSquare` from lucide-react.

2. Add new prop to `StepActionScreenProps`:
```typescript
onGenerateDraft: (instructions?: string) => void;
```
Change from `() => void` to `(instructions?: string) => void`.

3. Add state for instructions input:
```typescript
const [regenInstructions, setRegenInstructions] = useState('');
const [showInstructionInput, setShowInstructionInput] = useState(false);
```

4. Update `handleRegenerate`:
```typescript
const handleRegenerate = useCallback(() => {
  onGenerateDraft(regenInstructions.trim() || undefined);
  setRegenInstructions('');
  setShowInstructionInput(false);
}, [onGenerateDraft, regenInstructions]);
```

5. Replace the "Generate Draft from Screenshot" / "Regenerate from Screenshot" button section (lines 303-323). When a draft already exists (regeneration mode), show a two-part UI:

```tsx
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
```

When the "Regenerate" button is clicked and there's already a draft, it first shows the instruction input. User can type instructions and hit "Regenerate", or skip instructions and just hit the main button again.

**LeadDetail.tsx -- Wire userInstructions through handleGenerateDraft:**

1. Change `handleGenerateDraft` signature to accept instructions:
```typescript
const handleGenerateDraft = useCallback(
  (stepId: number, userInstructions?: string) => {
```

2. Pass `userInstructions` to `draftMutation.mutate`:
```typescript
draftMutation.mutate(
  {
    proofUrl: step.proof_url,
    leadId: lead.id,
    stepId,
    telegramId,
    leadName: ...,
    leadTitle: ...,
    leadCompany: ...,
    leadStatus: lead.status,
    webResearch: lead.web_research,
    userInstructions,
  },
  ...
);
```

3. Update the `onGenerateDraft` prop passed to `StepActionScreen`:
```typescript
onGenerateDraft={(instructions?: string) => handleGenerateDraft(step.step_id, instructions)}
```

**bot/storage/models.py -- Add user_instructions field to DraftRequestModel:**

Add after `lead_context` field (line 237):
```python
user_instructions: str | None = None
```

**bot/services/draft_poller.py -- Pass user_instructions to agent context:**

In `_process_draft_request`, update the `agent_input` construction (around line 72-75):
```python
agent_input = AgentInput(
    user_message="Generate contextual response options from this screenshot.",
    context={
        "lead_context": request.lead_context or {},
        "user_instructions": request.user_instructions,
    },
)
```

**bot/agents/comment_generator.py -- Incorporate user_instructions in prompt:**

In the `run` method, after the lead_context block (after line 57), add:
```python
user_instructions = input_data.context.get("user_instructions")
if user_instructions:
    parts.append(f"\n**User Instructions:**")
    parts.append(f"The user has specifically requested: {user_instructions}")
    parts.append("Please follow these instructions while generating the response options.")
```
  </action>
  <verify>
1. `cd /Users/dmytrolevin/Downloads/GD_playground/packages/webapp && npx tsc --noEmit` -- no type errors.
2. Verify migration file exists: `cat insforge/migrations/008_draft_requests_user_instructions.sql`
3. Verify Python syntax: `cd /Users/dmytrolevin/Downloads/GD_playground && python3 -c "import ast; ast.parse(open('bot/services/draft_poller.py').read()); ast.parse(open('bot/agents/comment_generator.py').read()); ast.parse(open('bot/storage/models.py').read()); print('OK')"`
  </verify>
  <done>
User can type custom instructions before regenerating a draft. Instructions flow: StepActionScreen textarea -> LeadDetail handleGenerateDraft -> useGenerateDraft mutation (inserts user_instructions column) -> draft_requests table -> draft_poller reads and passes to agent context -> CommentGeneratorAgent includes instructions in LLM prompt. First-time generation skips the instruction input (no existing draft to improve upon). Migration file ready for manual execution.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add LinkedIn character counter to DraftCopyCard</name>
  <files>
    packages/webapp/src/features/leads/components/DraftCopyCard.tsx
    packages/webapp/src/features/leads/components/StepActionScreen.tsx
  </files>
  <action>
**DraftCopyCard.tsx -- Add character counter for LinkedIn connection requests:**

1. Add `contentType?: string` to `DraftCopyCardProps` interface (after `platform`).

2. Define the LinkedIn invite limit constant at module level:
```typescript
const LINKEDIN_INVITE_CHAR_LIMIT = 200;
```

3. After the `<pre>` element that displays `displayText` (line 164-166), conditionally render a character counter when platform is 'linkedin' and contentType is 'connection_request', OR as a general length indicator when the text is long:

```tsx
{/* Character counter for LinkedIn invites */}
{platform === 'linkedin' && contentType === 'connection_request' && displayText && (
  <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] font-medium ${
    displayText.length > LINKEDIN_INVITE_CHAR_LIMIT
      ? 'text-error'
      : displayText.length > LINKEDIN_INVITE_CHAR_LIMIT * 0.85
        ? 'text-warning'
        : 'text-text-hint'
  }`}>
    <span>{displayText.length}/{LINKEDIN_INVITE_CHAR_LIMIT}</span>
    {displayText.length > LINKEDIN_INVITE_CHAR_LIMIT && (
      <span className="text-error">(exceeds LinkedIn invite limit)</span>
    )}
  </div>
)}
```

Also add a general character count display for any platform when length exceeds 280 chars (common social media limit):
```tsx
{/* General character count for long texts */}
{!(platform === 'linkedin' && contentType === 'connection_request') && displayText && displayText.length > 280 && (
  <div className="mt-1.5 text-right text-[10px] text-text-hint">
    {displayText.length} chars
  </div>
)}
```

**StepActionScreen.tsx -- Pass contentType to DraftCopyCard:**

Where `DraftCopyCard` is rendered with structured options (around line 278-284), add the `contentType` prop:
```tsx
<DraftCopyCard
  options={draftResult.options}
  platform={draftResult.platform}
  contentType={draftResult.content_type}
  onCopy={handleDraftCopy}
  onRegenerate={step.proof_url ? handleRegenerate : undefined}
  isRegenerating={isGeneratingDraft}
/>
```

Note: `DraftResult` already has `content_type` field (defined in useGenerateDraft.ts). This just passes it through.
  </action>
  <verify>
`cd /Users/dmytrolevin/Downloads/GD_playground/packages/webapp && npx tsc --noEmit` -- no type errors. Verify DraftCopyCard accepts and uses contentType prop. Verify character counter renders conditionally.
  </verify>
  <done>
LinkedIn connection request drafts show a colored character counter (green under 170, yellow 170-200, red over 200) with "(exceeds LinkedIn invite limit)" warning. Other long texts show a subtle character count for awareness. contentType is wired from DraftResult through StepActionScreen to DraftCopyCard.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `cd /Users/dmytrolevin/Downloads/GD_playground/packages/webapp && npx tsc --noEmit`
2. Python syntax valid: `python3 -c "import ast; [ast.parse(open(f).read()) for f in ['bot/services/draft_poller.py', 'bot/agents/comment_generator.py', 'bot/storage/models.py']]"`
3. Migration file exists at `insforge/migrations/008_draft_requests_user_instructions.sql`
4. All error handlers in LeadDetail.tsx extract error messages and provide retry actions
5. `userInstructions` flows from StepActionScreen -> LeadDetail -> useGenerateDraft -> DB -> draft_poller -> comment_generator
6. DraftCopyCard shows character counter when platform=linkedin and contentType=connection_request
</verification>

<success_criteria>
- Zero generic "Failed to..." error messages -- all errors are specific with context
- Upload-then-update failures offer "Retry linking" (not re-upload)
- Activity log failures are non-blocking (step still marked complete)
- Regeneration shows instruction input with textarea, 500-char limit, cancel/regenerate buttons
- Instructions persist through DB message bus to bot agent
- LinkedIn invite drafts show character count with color-coded limit warning
- All changes are backward compatible (no instructions = same behavior as before)
</success_criteria>

<output>
After completion, create `.planning/quick/007-step-action-fixes-and-regen-input/007-SUMMARY.md`
</output>
