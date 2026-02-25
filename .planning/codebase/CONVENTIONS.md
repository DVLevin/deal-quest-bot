# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files (Python):**
- snake_case for all modules: `bot/utils_validation.py`, `bot/task_utils.py`, `bot/services/plan_scheduler.py`
- Handler modules: `bot/handlers/context_input.py`, `bot/handlers/comment.py`, `bot/handlers/reminders.py`
- Agent modules: `bot/agents/extraction.py`, `bot/agents/reanalysis_strategist.py`
- Utility files prefixed with `utils_`: `utils_validation.py`, `utils_tma.py`

**Files (TypeScript):**
- PascalCase for React components: `ErrorBoundary.tsx`, `EmptyState.tsx`, `Toast.tsx`, `ErrorCard.tsx`
- camelCase for utilities: `insforge.ts`
- Component directories match component names: `features/dashboard/components/ProgressCard.tsx`

**Functions (Python):**
- snake_case for all functions: `validate_user_input()`, `compute_analysis_diff()`, `pre_resize_image()`
- Async functions: `async def on_context_add_start()`, `async def schedule_plan_reminders()`
- Private functions prefixed with underscore: `_lead_display_name()`, `_format_value()`, `_check_mistyped_command()`
- Handler functions named `on_` for callbacks: `on_context_text()`, `on_reminder_done()`
- Command handlers prefixed `cmd_`: `cmd_support()`, `cmd_comment()`

**Functions (TypeScript):**
- camelCase for all functions: `createAuthenticatedClient()`, `getInsforge()`, `useLevelUpDetection()`
- React components: PascalCase: `ErrorBoundary`, `EmptyState`, `ToastContainer`
- Hook functions prefixed `use`: `useSupportSessions()`, `useLevelUpDetection()`

**Variables (Python):**
- snake_case: `lead_id`, `telegram_id`, `context_items`, `new_context_items`
- Constants: UPPER_SNAKE_CASE: `MAX_DIMENSION`, `PLAN_CHECK_INTERVAL`, `DEFAULT_SPACING_DAYS`, `KNOWN_COMMANDS`
- Module-level constants for patterns: `URL_PATTERN`, `TIMING_PATTERNS`

**Variables (TypeScript):**
- camelCase: `insforgeAuth`, `message`, `onRetry`
- Constants: UPPER_SNAKE_CASE: `INSFORGE_URL`, `INSFORGE_ANON_KEY`
- React props: camelCase with type interfaces: `ErrorCardProps`, `EmptyStateProps`

**Types (Python):**
- PascalCase with suffix: `ValidationResult`, `AgentInput`, `AgentOutput`, `LeadActivityModel`, `ScheduledReminderModel`
- Pydantic models end in `Model`: `UserModel`, `LeadRegistryModel`, `PipelineTraceModel`
- FSM states end in `State`: `ReanalysisState`, `SupportState`, `CommentSupportState`
- Settings class: `Settings` (BaseSettings)

**Types (TypeScript):**
- PascalCase: `ErrorBoundaryProps`, `ErrorBoundaryState`, `Toast`
- Interface names match component name + `Props`: `ErrorCardProps`, `EmptyStateProps`
- Type imports from SDK: `InsForgeClient`

## Code Style

**Formatting (Python):**
- No explicit formatter config detected (no `.black`, `.ruff.toml`, or `pyproject.toml` with formatter settings)
- Consistent 4-space indentation
- Line length appears to be ~100 characters (soft limit)
- Type hints used extensively: `def parse_step_due_date(step: dict, base_date: datetime, step_index: int) -> datetime:`
- Optional types: `str | None` (Python 3.10+ union syntax)

**Formatting (TypeScript):**
- No explicit formatter config detected (no `.prettierrc` or `.eslintrc`)
- TSConfig enforces strict mode: `"strict": true`
- 2-space indentation (standard React/Vite default)
- Single quotes for strings (observed in imports)
- Trailing commas in multiline (observed in objects)

**Linting (Python):**
- Type checking via type hints throughout
- `from __future__ import annotations` at top of every module for forward references
- Mypy-style type hints: `def foo(x: int) -> str | None:`

**Linting (TypeScript):**
- TSConfig strict mode enabled:
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
  - `"forceConsistentCasingInFileNames": true`

## Import Organization

**Order (Python):**
1. Future imports: `from __future__ import annotations`
2. Standard library: `import asyncio`, `import logging`, `import json`, `import re`
3. Third-party dependencies: `from aiogram import Bot, F, Router`, `from pydantic import BaseModel`
4. Local project imports:
   - `from bot.agents.base import AgentInput, AgentOutput`
   - `from bot.services.crypto import CryptoService`
   - `from bot.storage.models import LeadActivityModel`
   - `from bot.storage.repositories import LeadRegistryRepo`
5. Relative imports for same-package: `from .base import BaseAgent` (rare, absolute preferred)

**Order (TypeScript):**
1. React core: `import { Component, type ErrorInfo, type ReactNode } from 'react';`
2. Third-party libraries: `from 'react-router';`, `from 'lucide-react';`
3. Local imports grouped by domain:
   - Shared UI: `import { Button } from '@/shared/ui/Button';`
   - Features: `import { LeadList } from '@/features/leads/components/LeadList';`
   - Lib/utils: `import { getInsforge } from '@/lib/insforge';`

**Path Aliases (TypeScript):**
- `@/*` maps to `./src/*`: `@/shared/ui/Button`, `@/features/dashboard/components/ProgressCard`
- `@deal-quest/shared` maps to `./src/types/index.ts` (shared types package)

**Path Aliases (Python):**
- Absolute imports from `bot.` package root: `from bot.agents.extraction import ExtractionAgent`
- No relative imports (all absolute from package root)

## Error Handling

**Patterns (Python):**

**Try-except with logging:**
```python
try:
    result = await agent.run(agent_input, pipeline_ctx)
except Exception as e:
    logger.error("ReanalysisStrategistAgent error: %s", e)
    return AgentOutput(success=False, error=str(e))
```

**Validation results with typed errors:**
```python
@dataclass
class ValidationResult:
    is_valid: bool
    error_message: str | None = None
    cleaned_input: str | None = None
```

**Graceful fallbacks:**
```python
if not _PROMPT_PATH.exists():
    logger.warning("Extraction prompt not found: %s", _PROMPT_PATH)
    # Fallback minimal prompt
    self._prompt = "Extract visible information..."
```

**Optimistic updates with error logging:**
```python
try:
    await callback.message.edit_text(...)
except Exception:
    pass  # Silent fail for message edits (user may have deleted)
```

**Patterns (TypeScript):**

**Error boundaries for React tree:**
```typescript
static getDerivedStateFromError(error: Error): ErrorBoundaryState {
  return { hasError: true, error };
}

componentDidCatch(error: Error, info: ErrorInfo): void {
  console.error('[ErrorBoundary]', error, info.componentStack);
}
```

**Component-level error states:**
```typescript
<ErrorCard
  message="Failed to load data"
  onRetry={refetch}
  compact={false}
/>
```

**Client initialization guards:**
```typescript
export function getInsforge(): InsForgeClient {
  if (!insforgeAuth) {
    throw new Error(
      'InsForge client not authenticated. Call createAuthenticatedClient first.'
    );
  }
  return insforgeAuth;
}
```

## Logging

**Framework (Python):** Standard library `logging`

**Patterns:**
```python
logger = logging.getLogger(__name__)

logger.info("Scheduled %d reminders for lead %s", count, lead_id)
logger.warning("Extraction prompt not found: %s", path)
logger.error("Comment generation failed: %s", e)
logger.debug("Background task %s was cancelled", task.get_name())
```

**When to log:**
- INFO: Successful operations with key metrics: `"Sent reminder for lead %s step %s"`
- WARNING: Missing config or degraded functionality: `"Voice transcription not configured"`
- ERROR: Operation failures with exception details: `"Failed to process reminder %s: %s"`
- DEBUG: Background task lifecycle events

**Structured logging:**
- Use `%s` placeholders: `logger.error("Failed: %s", e)`
- Include context: lead_id, telegram_id, step_id in messages

**Framework (TypeScript):** `console` API

**Patterns:**
```typescript
console.error('[ErrorBoundary]', error, info.componentStack);
```

**When to log:**
- Errors in ErrorBoundary catch
- Client initialization errors (throw instead of log)
- Environment validation errors (throw at module load)

## Comments

**When to Comment (Python):**

**Docstrings for modules:**
```python
"""Handler for collecting context input on leads for re-analysis."""
```

**Docstrings for functions:**
```python
def parse_step_due_date(step: dict, base_date: datetime, step_index: int) -> datetime:
    """Parse step timing to compute due_at date.

    Priority:
    1. delay_days integer field (most reliable, from LLM structured output)
    2. timing string field (regex patterns)
    3. Default spacing (step_index + 1) * DEFAULT_SPACING_DAYS
    """
```

**Inline comments for non-obvious logic:**
```python
# Optimistic update BEFORE sending (at-most-once delivery)
await reminder_repo.mark_reminded(reminder.id, now_iso)
```

**Section headers:**
```python
# ─── Re-analysis Execution ─────────────────────────────────────────
```

**When to Comment (TypeScript):**

**JSDoc for exported components and functions:**
```typescript
/**
 * Standardized error display component for failed queries and operations.
 *
 * - Default mode: renders inside a Card with centered icon, message, and optional retry button.
 * - Compact mode: renders a single inline row with icon, message, and optional retry text link.
 */
export function ErrorCard({ message, onRetry, compact }: ErrorCardProps) { ... }
```

**Inline comments for critical behavior:**
```typescript
// IMPORTANT: We intentionally do NOT call setAuthToken() here.
// Our Edge Function mints custom JWTs (HS256 with our own secret),
// but InsForge PostgREST uses a different JWT secret and rejects them
```

**TSDoc:**
- Used for exported components/functions
- `@param` for prop documentation via interface (not inline)

## Function Design

**Size (Python):**
- Handlers: 50-200 lines typical (e.g., `on_reanalyze_start()` is 310 lines, but complex flow)
- Services: 20-80 lines per method (e.g., `compute_analysis_diff()` is 47 lines)
- Utilities: 10-40 lines (e.g., `pre_resize_image()` is 49 lines)

**Size (TypeScript):**
- React components: 20-100 lines (e.g., `ErrorCard` is 54 lines, `EmptyState` is 40 lines)
- Pages: 20-60 lines (composition of smaller components)
- Hooks: 20-80 lines

**Parameters (Python):**
- Use dependency injection via handler parameters: `user_repo: UserRepo`, `crypto: CryptoService`
- Keyword-only parameters for options: `def validate_user_input(text: str, *, min_length: int = 1)`
- Type hints required for all parameters

**Parameters (TypeScript):**
- Props via interface with destructuring: `{ message = 'Failed to load data', onRetry, compact = false }: ErrorCardProps`
- Optional props with `?`: `onRetry?: () => void`
- Default values in destructure: `compact = false`

**Return Values (Python):**
- Explicit return type hints: `-> ValidationResult`, `-> datetime`, `-> str | None`
- Return typed models: `return AgentOutput(success=True, data=parsed)`
- None for procedures: `async def on_context_done(...) -> None:`

**Return Values (TypeScript):**
- Inferred types (no explicit annotations)
- JSX for React components: `return <div>...</div>`
- Typed via function signature in interface

## Module Design

**Exports (Python):**
- All functions/classes exported implicitly (no `__all__` used)
- Import what you need: `from bot.services.diff_utils import compute_analysis_diff`

**Exports (TypeScript):**
- Named exports for components: `export function ErrorCard() { ... }`
- Named exports for utilities: `export function getInsforge() { ... }`
- Default exports for pages: `export default function Dashboard() { ... }`

**Barrel Files (TypeScript):**
- Not detected in explored files
- Direct imports preferred: `import { Button } from '@/shared/ui/Button'`

**Module Structure (Python):**
- One primary class/function per module
- Helper functions prefixed with `_` in same file
- Constants at module top (after imports)

**Module Structure (TypeScript):**
- One primary component per file
- Helper components in same file (e.g., `ToastItem` inside `Toast.tsx`)
- Types co-located with component

---

*Convention analysis: 2026-02-06*
