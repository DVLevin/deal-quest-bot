# Phase 10: Error Handling & UX - Research

**Researched:** 2026-02-04
**Domain:** React error handling, toast notifications, empty states, bot input validation
**Confidence:** HIGH

## Summary

This research covers five requirements for Phase 10: global error boundary (UX-V11-01), query error consistency (UX-V11-02), mutation error feedback (UX-V11-03), bot input validation (UX-V11-04), and empty state improvements (UX-V11-05).

The TMA currently has **no error boundary** -- any unhandled React error results in a white screen. Error handling for queries is **inconsistent**: some components check `isError` (13 components), others silently ignore errors. Mutations have optimistic updates with rollback but **zero user-visible error feedback**. The bot handlers have inline validation that is duplicated and inconsistent across support.py, learn.py, and train.py. Empty states range from well-designed (CasebookList) to nonexistent (no data on several pages just renders nothing).

**Primary recommendation:** Build 4 small, focused UI components (ErrorBoundary, ErrorCard, Toast system, EmptyState) and a bot validation utility, then wire them into all existing code paths. No external libraries needed -- all components are simple enough to hand-roll with the existing design system.

## Current State Audit

### 1. Error Boundary (UX-V11-01)

**Current:** No error boundary exists anywhere. The app tree is:
```
main.tsx (try/catch for SDK init only -- writes raw HTML on failure)
  -> App.tsx
    -> AuthProvider (has loading/error states for auth only)
      -> QueryProvider
        -> BrowserRouter
          -> Suspense (PageSkeleton fallback for lazy loading only)
            -> Routes
```

An unhandled error in any component will crash the entire app with a white screen. The `AuthProvider` handles auth errors specifically but nothing catches render-time errors from data components.

**Key files:** `packages/webapp/src/main.tsx`, `packages/webapp/src/app/App.tsx`

### 2. Query Error Handling (UX-V11-02)

**Current pattern audit -- 13 components handle isError, each differently:**

| Component | Error Display | Retry? |
|-----------|--------------|--------|
| ProgressCard | `"Unable to load progress"` in Card | No |
| LeaderboardWidget | `"Unable to load leaderboard"` plain text | No |
| BadgePreview | `"Unable to load badges"` plain text | No |
| BadgeWall | `"Unable to load badges"` centered text | No |
| ProfileHeader | `"Unable to load profile"` centered text | No |
| AttemptHistory | `"Unable to load attempt history"` centered | No |
| TeamOverview | `"Unable to load team stats"` in Card | No |
| MemberLeaderboard | `"Unable to load leaderboard"` in Card | No |
| WeakAreas | `"Unable to load weak areas"` in Card | No |
| ActivityFeed | `"Unable to load recent activity"` in Card | No |
| TrackList | `"Failed to load progress"` with error bg + **Retry button** | **YES** |
| BadgeCollection | `"Unable to load badges"` centered text | No |

**Key findings:**
- Only `TrackList` has a retry button (calls `refetch()`)
- All use `text-text-hint` or `text-error` styling -- no consistency
- Some are in Card wrappers, some are plain divs
- None show the actual error message to aid debugging
- None have icons

**Components that DON'T check isError (silently fail):**
- `CasebookHome` -- uses `useCasebook()`, destructures only `data, isLoading`
- `SupportHome` -- uses `useSupportSessions()`, destructures only `data, isLoading`
- `SessionHistory` -- same as SupportHome
- `LeadList` -- uses `useLeads()`, destructures only `data, isLoading`
- `LeadDetail` -- uses `useLead()`, destructures only `data, isLoading`
- `ActivityTimeline` -- uses `useLeadActivities()`, destructures only `data, isLoading`
- `SettingsPanel` -- uses `useUserSettings()`, destructures only `data, isLoading`
- `StatsOverview` -- uses `useUserStats()`, destructures only `isLoading` (no error)
- `PerformanceChart` -- uses `useTeamStats()`, destructures only `data, isLoading`
- `WeakAreasCard (Dashboard)` -- uses `useTrainingStats()`, no error handling

### 3. Mutation Error Handling (UX-V11-03)

**3 mutation hooks exist, none show errors to users:**

| Hook | Optimistic? | onError rollback? | User error feedback? |
|------|-------------|-------------------|---------------------|
| `useUpdateLeadStatus` | YES (cache update) | YES (rollback cache) | **NO** |
| `useAddLeadNote` | NO (shows "Saving...") | NO rollback needed | **NO** |
| `useUpdateSettings` | NO | NO | **NO** |

- `useUpdateLeadStatus`: Has full optimistic pattern (onMutate/onError/onSettled) but when error occurs, only the cache rolls back. The user sees the status flip back but gets no explanation.
- `useAddLeadNote`: On error, `mutation.isPending` goes false, button re-enables, but no error message appears. The user's typed note remains in the textarea.
- `useUpdateSettings`: Silent failure. Provider/model reverts on refetch but user gets no feedback.

### 4. Empty State Audit (UX-V11-05)

**Current empty states:**

| Component | Empty State Quality | Description |
|-----------|-------------------|-------------|
| CasebookList (no entries) | **EXCELLENT** | Full designed component with icon, gradient, explanatory text, CTA button linking to bot |
| CasebookList (no filter results) | **GOOD** | Styled card with message + suggestion |
| LeadList | **GOOD** | Users icon + "No leads yet" + guidance text |
| SupportHome (sessions) | **GOOD** | Card with "No sessions yet" + detailed guidance |
| SessionHistory | **BASIC** | Plain "No support sessions yet." in card |
| AttemptHistory | **BASIC** | "No attempts yet -- start training to see your history!" |
| BadgePreview (Dashboard) | **BASIC** | "No badges earned yet -- start training!" |
| LeaderboardWidget (no data) | **BASIC** | "Complete your first scenario to join the leaderboard!" |
| ActivityTimeline | **BASIC** | "No activity recorded yet." plain text |
| BadgeWall (no earned) | **GOOD** | Guidance text + shows locked badges |
| WeakAreasCard (no data) | N/A | Returns null (hides entirely) -- appropriate |
| PerformanceChart (no data) | **BASIC** | "No performance data yet" centered |
| MemberLeaderboard (no entries) | **BASIC** | "No team members" |
| ActivityFeed (no items) | **BASIC** | "No recent activity" |

**Areas needing improvement for UX-V11-05:**
1. **LeadList** -- already good but could match CasebookList quality
2. **AttemptHistory** -- needs icon and better guidance
3. **SessionHistory** -- needs icon and CTA
4. Main pages with no data need the most improvement

### 5. Bot Validation Audit (UX-V11-04)

**support.py validation (on_support_input):**
- Empty check: `if not user_input.strip()` -> "Please describe your prospect or send a screenshot."
- Command detection: `if user_input.strip().startswith("/")` -> fuzzy match + clear state
- Length check: `if len(user_input.strip()) < 10` -> "That's quite short. Please provide more context..."
- No max length check (user_input passed directly, only truncated at storage: `user_input[:2000]`)

**learn.py validation (on_learn_answer):**
- Cancel check: `if user_response.strip().lower() == "/cancel"` -> clear state + message
- Empty check: `if not user_response.strip()` -> "Please type your response to the scenario."
- No min length check
- No max length check
- No command detection

**train.py validation (on_train_answer):**
- Cancel check: `if user_response.strip().lower() == "/cancel"` -> clear state + message
- Empty check: `if not user_response.strip()` -> "Please type your response to the scenario."
- No min length check
- No max length check
- No command detection

**Inconsistencies identified:**
1. Support has min length check (10 chars), learn/train do not
2. Support has command detection with fuzzy matching, learn/train do not
3. Error message text differs: support says "describe your prospect", learn/train say "type your response"
4. No max length validation anywhere (just silent truncation at storage)
5. No check for gibberish/repeated characters
6. Cancel handling differs: support uses command detection, learn/train check `/cancel` literally

## Standard Stack

### Core (no new libraries needed)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| React 18 class component | 18.3.1 | Error boundary | React requires class component for componentDidCatch/getDerivedStateFromError |
| Existing Tailwind CSS 4 | 4.1.0 | All component styling | Already in use, design tokens defined |
| Existing Lucide React | 0.562.0 | Icons for ErrorCard, EmptyState | Already in use throughout the app |
| CSS `@keyframes` | native | Toast slide-in animation | Lighter than JS animation libraries |

### Alternatives Considered

| Instead of | Could Use | Why NOT |
|------------|-----------|---------|
| Custom toast | react-hot-toast | Extra dependency for a simple feature. This app only needs 2 toast types (error, success). Building ~50 lines of code. |
| Custom ErrorBoundary | react-error-boundary | Extra dependency. React 18 error boundaries are a single class component (~30 lines). The library adds features (retry strategies, fallback components) that aren't needed here. |
| Custom EmptyState | Illustration library | The app uses Lucide icons consistently. Adding illustrations would be inconsistent. |

**No installation needed.** All requirements can be met with existing dependencies.

## Architecture Patterns

### New Component Structure
```
packages/webapp/src/shared/
  ui/
    ErrorBoundary.tsx     # UX-V11-01: Class component wrapping App
    ErrorCard.tsx          # UX-V11-02: Reusable query error display
    Toast.tsx              # UX-V11-03: Toast notification system
    EmptyState.tsx         # UX-V11-05: Reusable empty state component
    index.ts              # Update exports

bot/
  utils_validation.py     # UX-V11-04: Shared validation utility
```

### Pattern 1: React Error Boundary (Class Component)

**What:** React 18 requires class components for error boundaries. No functional component equivalent exists.
**When to use:** Wrap the entire app tree to catch any unhandled render error.

```typescript
// packages/webapp/src/shared/ui/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
            {/* AlertTriangle from lucide-react or inline SVG */}
          </div>
          <h1 className="text-lg font-bold text-text">Something went wrong</h1>
          <p className="text-sm text-text-secondary">
            The app encountered an unexpected error.
          </p>
          <button onClick={this.handleRetry} className="...">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Placement in App.tsx:**
```typescript
// App.tsx
<ErrorBoundary>
  <AuthProvider>
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  </AuthProvider>
</ErrorBoundary>
```

**Confidence:** HIGH -- React 18 error boundary pattern is well-documented and stable.

### Pattern 2: ErrorCard Component

**What:** Reusable component for rendering query error states with consistent styling and retry.
**When to use:** Replace all 13+ inconsistent `isError` checks across the app.

```typescript
// packages/webapp/src/shared/ui/ErrorCard.tsx
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean; // For use inside Cards vs standalone
}

export function ErrorCard({
  message = 'Failed to load data',
  onRetry,
  compact = false,
}: ErrorCardProps) {
  // compact: just icon + message + retry link (for inside existing Cards)
  // full: Card wrapper with more padding (for standalone)
}
```

**Integration pattern -- replace inline error checks:**
```typescript
// BEFORE (current inconsistent pattern)
if (isError || !data) {
  return (
    <Card>
      <p className="text-sm text-text-hint">Unable to load team stats</p>
    </Card>
  );
}

// AFTER (standardized)
if (isError) {
  return <ErrorCard message="Unable to load team stats" onRetry={refetch} />;
}
```

**Confidence:** HIGH -- straightforward component extraction.

### Pattern 3: Lightweight Toast System

**What:** A context-based toast system with a ToastProvider and useToast hook.
**When to use:** Show error/success feedback for mutations.

```typescript
// Toast system architecture:
// 1. ToastProvider wraps the app (above Router, below QueryProvider)
// 2. useToast() hook returns { toast } function
// 3. Toast container renders fixed-positioned toast stack
// 4. Auto-dismiss after configurable timeout (default 4s)

// Usage in mutation hooks:
const { toast } = useToast();

const mutation = useMutation({
  mutationFn: ...,
  onError: (error) => {
    toast({
      type: 'error',
      message: 'Failed to update status',
      action: { label: 'Retry', onClick: () => mutation.mutate(vars) },
    });
  },
  onSuccess: () => {
    toast({ type: 'success', message: 'Status updated' });
  },
});
```

**Implementation approach:**
- Use React Context + useState for toast queue
- CSS `@keyframes` for slide-in from top
- Zustand store alternative: Could use a small Zustand store instead of Context, since Zustand is already a dependency. This avoids provider nesting but both approaches work.
- Fixed position at top of viewport (below Telegram header)
- Max 3 toasts visible, FIFO queue
- Auto-dismiss with progress indicator
- Optional retry action button

**Confidence:** HIGH -- standard pattern, no novel concepts.

### Pattern 4: EmptyState Component

**What:** Reusable component for empty data states with icon, heading, description, and optional CTA.
**When to use:** Replace inconsistent empty state rendering across pages.

```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Confidence:** HIGH -- straightforward component.

### Pattern 5: Bot Validation Utility

**What:** Shared Python function for input validation across handlers.
**When to use:** Called at the start of each handler's text input processing.

```python
# bot/utils_validation.py

class ValidationResult:
    """Result of user input validation."""
    is_valid: bool
    error_message: str | None
    cleaned_input: str | None

def validate_user_input(
    text: str,
    *,
    min_length: int = 1,
    max_length: int = 4000,
    context: str = "general",  # "support", "learn", "train"
    allow_commands: bool = False,
) -> ValidationResult:
    """Shared validation for all bot handlers."""
    # 1. Strip and check empty
    # 2. Check for commands (with fuzzy matching from support.py)
    # 3. Min length check with context-specific messages
    # 4. Max length check with truncation
    # 5. Return cleaned input
```

**Confidence:** HIGH -- straightforward extraction and consolidation.

### Anti-Patterns to Avoid

- **Don't catch errors in queryFn:** Let TanStack Query handle error state. The queryFn should `throw` on error (which all hooks already do correctly).
- **Don't use `window.alert()` for errors:** Use the toast system instead.
- **Don't swallow mutation errors silently:** Every mutation must have user-visible feedback on error.
- **Don't show raw error objects to users:** Always map to user-friendly messages.
- **Don't add error boundary inside lazy routes:** One boundary at the App level is sufficient. Component-level boundaries would be over-engineering.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundary | Custom hook-based solution | React class component | React 18 requires class components for error boundaries. No hook alternative exists. |
| Complex toast library | Full-featured notification system with categories, persistence, etc. | Simple context + fixed-position div | Only need error + success types. 3 mutations total in the app. |
| Error tracking/reporting | Sentry integration | Console.error in ErrorBoundary | This is a TMA, not a production SaaS. Console logging is sufficient for now. |

**Key insight:** The app has exactly 3 mutations and ~20 query hooks. The error handling needs are modest. A simple, lightweight approach (4 small components + 1 Python utility) is far better than installing libraries.

## Common Pitfalls

### Pitfall 1: Error Boundary Doesn't Catch Async Errors
**What goes wrong:** Error boundaries only catch errors during rendering, lifecycle methods, and constructors. They do NOT catch errors in event handlers, async code, or server-side code.
**Why it happens:** React's error boundary API is render-phase only by design.
**How to avoid:** Use error boundaries for render crashes. Use try/catch + toast for async operations (mutations). TanStack Query handles async query errors internally.
**Warning signs:** White screen on async error despite having error boundary.

### Pitfall 2: Toast Z-Index Conflicts with Telegram UI
**What goes wrong:** Toasts appear behind the Telegram header or navbar.
**Why it happens:** Telegram's WebApp container has its own z-index stacking context.
**How to avoid:** Use z-50 or higher for the toast container. Position below the Telegram content safe area using `var(--tg-viewport-content-safe-area-inset-top)`. Test in actual Telegram client, not just browser.
**Warning signs:** Toast hidden or partially visible in production.

### Pitfall 3: Retry Causing Stale Closures
**What goes wrong:** Toast retry button retries with stale mutation variables.
**Why it happens:** The retry callback closes over the variables at the time of error.
**How to avoid:** Pass the mutation variables to the toast action, or use a ref to the latest variables.
**Warning signs:** Retry silently does nothing or retries with wrong data.

### Pitfall 4: ErrorCard Flickers During Refetch
**What goes wrong:** After a retry, the error state briefly appears before loading state.
**Why it happens:** TanStack Query keeps `isError: true` until the refetch succeeds.
**How to avoid:** Check `isFetching` alongside `isError`. If refetching after error, show loading skeleton not error card: `if (isError && !isFetching)`.
**Warning signs:** Error card flashes briefly on every refetch.

### Pitfall 5: Bot Validation Breaking Existing Flows
**What goes wrong:** Shared validation utility is too strict and blocks valid inputs.
**Why it happens:** Different handlers have different valid input ranges (support needs context, train needs short responses).
**How to avoid:** Use context-specific validation parameters. Support: min 10 chars. Learn/Train: min 1 char (empty check only). Max length: 4000 for all.
**Warning signs:** Users report "input too short" when giving valid training responses.

## Code Examples

### Example 1: ErrorCard with Retry (for query errors)

```typescript
// Usage in component:
import { ErrorCard } from '@/shared/ui';

export function TeamOverview() {
  const { data, isLoading, isError, refetch } = useTeamStats();

  if (isLoading) { return <LoadingSkeleton />; }
  if (isError) {
    return <ErrorCard message="Unable to load team stats" onRetry={() => refetch()} />;
  }
  // ... render data
}
```

### Example 2: Toast Integration with Mutation

```typescript
// In LeadNotes.tsx or wherever mutations are called:
import { useToast } from '@/shared/ui/Toast';

export function LeadNotes({ leadId, currentNote }: LeadNotesProps) {
  const { toast } = useToast();
  const mutation = useAddLeadNote();

  const handleSubmit = () => {
    if (!noteText.trim() || !telegramId) return;
    const vars = { leadId, telegramId, note: noteText.trim() };

    mutation.mutate(vars, {
      onSuccess: () => {
        setNoteText('');
        toast({ type: 'success', message: 'Note saved' });
      },
      onError: () => {
        toast({
          type: 'error',
          message: 'Failed to save note',
          action: { label: 'Retry', onClick: () => mutation.mutate(vars) },
        });
      },
    });
  };
  // ...
}
```

### Example 3: Bot Shared Validation

```python
# bot/utils_validation.py
from dataclasses import dataclass

KNOWN_COMMANDS = {
    "/start", "/support", "/learn", "/train", "/stats",
    "/settings", "/leads", "/admin", "/help", "/cancel",
}

@dataclass
class ValidationResult:
    is_valid: bool
    error_message: str | None = None
    cleaned_input: str | None = None
    is_command: bool = False
    suggested_command: str | None = None

def validate_user_input(
    text: str,
    *,
    min_length: int = 1,
    max_length: int = 4000,
    context: str = "general",
) -> ValidationResult:
    stripped = text.strip()

    if not stripped:
        messages = {
            "support": "Please describe your prospect or send a screenshot.",
            "learn": "Please type your response to the scenario.",
            "train": "Please type your response to the scenario.",
        }
        return ValidationResult(
            is_valid=False,
            error_message=messages.get(context, "Please provide some input."),
        )

    if stripped.startswith("/"):
        # Reuse the fuzzy matching logic from support.py
        suggested = _check_mistyped_command(stripped)
        return ValidationResult(
            is_valid=False,
            is_command=True,
            suggested_command=suggested,
            error_message=None,  # Caller formats the message
        )

    if len(stripped) < min_length:
        messages = {
            "support": (
                "That's quite short. Please provide more context about your prospect:\n"
                "- Their role, company, and situation\n"
                "- Or send a LinkedIn screenshot\n"
                "- Or a voice message"
            ),
            "learn": "Please provide a more detailed response to the scenario.",
            "train": "Please provide a more detailed response to the scenario.",
        }
        return ValidationResult(
            is_valid=False,
            error_message=messages.get(context, "Input is too short."),
        )

    cleaned = stripped[:max_length]
    return ValidationResult(is_valid=True, cleaned_input=cleaned)
```

## Integration Map

### Files Needing ErrorCard Integration (UX-V11-02)

**Components currently with inline error states (REPLACE with ErrorCard):**
1. `features/dashboard/components/ProgressCard.tsx` -- line 42-48
2. `features/dashboard/components/LeaderboardWidget.tsx` -- line 83-84
3. `features/dashboard/components/BadgePreview.tsx` -- line 91-92
4. `features/gamification/components/BadgeWall.tsx` -- line 38-41
5. `features/profile/components/ProfileHeader.tsx` -- line 30-36
6. `features/profile/components/AttemptHistory.tsx` -- line 88-91
7. `features/profile/components/BadgeCollection.tsx` -- line 110
8. `features/admin/components/TeamOverview.tsx` -- line 29-35
9. `features/admin/components/MemberLeaderboard.tsx` -- line 28-35
10. `features/admin/components/WeakAreas.tsx` -- line 42-49
11. `features/admin/components/ActivityFeed.tsx` -- line 62-69

**Components that need isError added (currently not checking):**
12. `features/casebook/components/CasebookList.tsx` (via parent Casebook page)
13. `features/leads/components/LeadList.tsx`
14. `features/leads/components/LeadDetail.tsx`
15. `features/leads/components/ActivityTimeline.tsx`
16. `features/support/components/SupportInput.tsx` (if it has queries)
17. `features/settings/components/SettingsPanel.tsx`
18. `features/profile/components/StatsOverview.tsx`

**Already good (TrackList) -- keep but standardize to use ErrorCard:**
19. `features/learn/components/TrackList.tsx` -- has retry, just style consistency

### Mutations Needing Toast Feedback (UX-V11-03)

1. `features/leads/hooks/useUpdateLeadStatus.ts` -- add onError toast + success toast
2. `features/leads/hooks/useAddLeadNote.ts` -- add onError toast + success toast
3. `features/settings/hooks/useUpdateSettings.ts` -- add onError toast

**Where toasts are triggered (in components):**
- `features/leads/components/LeadDetail.tsx` (status change via handleStatusChange)
- `features/leads/components/LeadNotes.tsx` (note save via handleSubmit)
- `features/settings/components/SettingsPanel.tsx` (provider/model change)

### Pages Needing Empty State Improvements (UX-V11-05)

**Priority targets (most user-visible):**
1. `features/leads/components/LeadList.tsx` -- has basic empty state, upgrade to match CasebookList quality
2. `features/profile/components/AttemptHistory.tsx` -- text-only empty state, needs icon + CTA
3. Support page `SupportHome` -- already decent but could use icon

**Already well-designed (no change needed):**
- `features/casebook/components/CasebookList.tsx` -- CasebookEmptyState is excellent
- `features/dashboard/components/BadgePreview.tsx` -- contextual message is fine
- `features/gamification/components/BadgeWall.tsx` -- shows locked badges, appropriate

### Bot Handler Files for Validation (UX-V11-04)

1. `bot/handlers/support.py` -- `on_support_input()` at line 782
2. `bot/handlers/learn.py` -- `on_learn_answer()` at line 439
3. `bot/handlers/train.py` -- `on_train_answer()` at line 451
4. New file: `bot/utils_validation.py`
5. Move `_check_mistyped_command()` and `_edit_distance()` from `support.py` to `utils_validation.py`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class error boundaries only | react-error-boundary library | 2023 | Library adds retry/reset helpers, but not worth the dependency for this app |
| Toast libraries (react-toastify, etc.) | Lightweight custom or sonner | 2024 | sonner is popular but at ~8KB. Custom is fine for 3 mutations. |
| Per-component error handling | TanStack Query global error handler | TQ v5 | Could use `queryClient.setDefaultOptions({ queries: { onError } })` but per-component is better UX since different components need different messages |

**Deprecated/outdated:**
- `componentDidCatch` alone: Use `getDerivedStateFromError` as well for proper state-based rendering
- `react-query` onError global callback in QueryClient: Removed in v5 for queries. Use component-level `isError` instead.

## Open Questions

1. **Toast position in Telegram WebApp**
   - What we know: Telegram has a header bar and the content area has safe area insets defined via CSS vars (`--tg-viewport-content-safe-area-inset-top`)
   - What's unclear: Exact z-index stacking in Telegram's WebView container
   - Recommendation: Start with `top-[calc(var(--spacing-content-top)+0.5rem)]` and `z-50`, test in real Telegram client

2. **Should we use Zustand or React Context for toast state?**
   - What we know: Zustand is already a dependency. Context would add another provider wrapper.
   - What's unclear: Performance implications are negligible for either approach.
   - Recommendation: Use Zustand -- avoids adding another provider to App.tsx, consistent with existing state management pattern. Simple standalone store that components can call without being wrapped in a provider.

## Sources

### Primary (HIGH confidence)
- Direct codebase audit of all 50+ source files in `packages/webapp/src/`
- Direct audit of `bot/handlers/support.py`, `learn.py`, `train.py`
- React 18 documentation on error boundaries (training data, stable API since React 16)
- TanStack Query v5 documentation on error handling (training data)

### Secondary (MEDIUM confidence)
- TanStack Query v5 `isError` behavior during refetch (verified via code patterns already in use)
- Telegram Mini App CSS variable naming for safe areas (verified in `globals.css`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, verified existing dependencies
- Architecture: HIGH -- all patterns are simple component extraction from existing code
- Integration map: HIGH -- based on direct line-by-line audit of all source files
- Bot validation: HIGH -- based on direct audit of all 3 handler files
- Pitfalls: MEDIUM -- toast z-index in Telegram needs real-device testing

**Research date:** 2026-02-04
**Valid until:** 2026-04-04 (stable -- no fast-moving dependencies involved)
