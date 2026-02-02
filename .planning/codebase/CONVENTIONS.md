# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Python Files:**
- snake_case for all Python files: `llm_router.py`, `config_loader.py`, `support.py`
- Module names match purpose: `bot/handlers/support.py`, `bot/services/llm_router.py`

**TypeScript Files:**
- PascalCase for React components: `Button.tsx`, `Card.tsx`, `AuthProvider.tsx`
- camelCase for utilities and hooks: `useAuth.ts`, `store.ts`, `cn.ts`
- PascalCase for pages: `Dashboard.tsx`, `Support.tsx`, `Learn.tsx`

**JavaScript Files:**
- kebab-case for edge functions: `db-proxy.js`
- camelCase for variables within: `corsHeaders`, `respond`

**Python Functions/Methods:**
- snake_case for all functions: `load_settings()`, `create_provider()`, `format_support_response()`
- Private functions prefixed with underscore: `_extract_json()`, `_sanitize()`, `_safe_serialize()`
- Async functions use `async def`: all handlers and service methods

**TypeScript Functions:**
- camelCase for regular functions: `authenticateWithTelegram()`, `createAuthenticatedClient()`
- PascalCase for React components: `Button()`, `Card()`, `Dashboard()`

**Python Variables:**
- snake_case for variables: `telegram_id`, `user_message`, `pipeline_ctx`
- UPPER_SNAKE_CASE for constants: `MAX_MESSAGE_LENGTH`, `MAX_RETRIES`, `RETRY_DELAYS`
- Private variables prefixed with underscore: `_trace_id`, `_span_stack`, `_prompt_template`
- ContextVar variables: `_trace_id: ContextVar[str | None]`

**TypeScript Variables:**
- camelCase for regular variables: `telegramId`, `isLoading`, `authClient`
- PascalCase for React components stored in variables: `Component`
- Short names for Zustand selectors: `useAuthStore((s) => s.telegramId)`

**Python Classes:**
- PascalCase with descriptive suffixes:
  - `BaseAgent`, `StrategistAgent`, `TrainerAgent` - Agent classes
  - `ClaudeProvider`, `OpenRouterProvider` - Provider classes
  - `CasebookService`, `EngagementService`, `KnowledgeService` - Service classes
  - `UserRepo`, `LeadRegistryRepo`, `SupportSessionRepo` - Repository classes
  - `UserModel`, `AttemptModel`, `PipelineTraceModel` - Model classes
  - `TraceContext`, `PipelineContext` - Context classes
  - `PipelineRunner` - Orchestration classes
  - `Settings` - Configuration classes

**TypeScript Types/Interfaces:**
- PascalCase for interfaces: `AuthState`, `ButtonProps`, `CardProps`
- Suffix `Row` for database types: `UserRow`, `AttemptRow`, `LeadRegistryRow`
- Suffix `Props` for component props: `ButtonProps`, `CardProps`
- Type aliases use PascalCase: `TrackStatus`, `AttemptMode`, `LLMProvider`

## Code Style

**Python Formatting:**
- No explicit formatter config detected (no `black`, `ruff format`, `yapf`)
- Inferred from codebase:
  - 4 spaces indentation (standard Python)
  - Line length: ~100-120 characters (soft limit, not enforced)
  - Double quotes for docstrings (standard)
  - Mixed single/double quotes for regular strings (no enforced preference)
  - Blank line between imports and code
  - Two blank lines between top-level definitions

**TypeScript Formatting:**
- No Prettier config detected
- Inferred from codebase:
  - 2 spaces indentation
  - Single quotes for imports and strings
  - Trailing commas in objects and arrays
  - Semicolons used consistently
  - Arrow functions preferred: `const Button = forwardRef<...>(...)`

**Python Linting:**
- No explicit linter config detected
- Type checking via Pydantic and type hints
- Modern Python patterns: `from __future__ import annotations` for forward references

**TypeScript Linting:**
- No ESLint config detected in project root
- TypeScript compiler flags provide strict type checking via `tsconfig.json`:
  - `strict: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `forceConsistentCasingInFileNames: true`

## Import Organization

**Python Order:**
1. Future imports: `from __future__ import annotations`
2. Standard library: `import asyncio`, `import logging`, `from datetime import datetime`
3. Third-party: `from aiogram import Bot, F, Router`, `from pydantic import BaseModel`
4. Local imports (absolute): `from bot.agents.registry import AgentRegistry`

**Python Path Style:**
- Absolute imports from project root: `from bot.services.llm_router import create_provider`
- Grouped by category: `from aiogram.types import (CallbackQuery, InlineKeyboardButton, ...)`

**TypeScript Order:**
1. React imports (if needed): `import { forwardRef } from 'react'`
2. Third-party: `import { create } from 'zustand'`, `import { clsx } from 'clsx'`
3. Path alias imports: `import { Card } from '@/shared/ui'`
4. Relative imports: `import { cn } from '@/shared/lib/cn'`

**TypeScript Path Aliases:**
- `@/*` maps to `./src/*` in webapp package (`packages/webapp/tsconfig.json`)
- Workspace dependencies: `@deal-quest/shared` via `workspace:*`
- No path aliases in shared package (relative imports only)

## Error Handling

**Python Patterns:**
- Try-except blocks with specific exception types first, generic `Exception` last
- Log errors before handling: `logger.error("Agent %s failed: %s", step.agent, e)`
- Return error states in data models: `AgentOutput(success=False, error=str(e))`
- HTTP errors caught specifically: `except httpx.HTTPStatusError as e:`
- Retry logic with exponential backoff:
```python
MAX_RETRIES = 3
RETRY_DELAYS = [1, 3, 8]
for attempt in range(MAX_RETRIES):
    try:
        # ... operation
    except httpx.HTTPStatusError as e:
        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(RETRY_DELAYS[attempt])
        else:
            raise
```
- Fallback values for JSON parsing: `return {"raw_response": text}` when parsing fails
- Context managers for cleanup: `async with TraceContext(...): ...`

**TypeScript Patterns:**
- Promise-based async/await (no explicit try-catch in UI components)
- Error states in Zustand stores: `error: string | null`
- InsForge SDK returns `{ data, error }` tuples (no exceptions thrown)

## Logging

**Python Framework:**
- Standard library `logging` module
- Logger per module: `logger = logging.getLogger(__name__)`

**Python Patterns:**
- Info level for milestones: `logger.info("Running pipeline: %s (%d steps)", config.name, len(config.steps))`
- Error level for failures: `logger.error("Agent %s failed: %s", step.agent, e)`
- Warning level for missing resources: `logger.warning("Strategist prompt not found: %s", _PROMPT_PATH)`
- Format: %-style string formatting: `logger.info("New lead %s created for user %s", saved_lead_id, tg_id)`

**TypeScript Logging:**
- No structured logging framework detected
- Console methods used directly (not observed in reviewed files)

## Comments

**Python When to Comment:**
- Module-level docstrings for all modules: `"""Handler for /support — deal analysis with strategist agent pipeline."""`
- Class docstrings: `"""Abstract base agent."""`
- Method docstrings: `"""Execute the agent's logic."""`
- Inline comments for non-obvious logic: `# Try direct parse`, `# Strip markdown code fences`
- Context comments for complex sections: `# Wall-clock timestamps for DB storage`
- Algorithm explanations: `# Group steps by execution mode`

**TypeScript When to Comment:**
- JSDoc-style block comments for interfaces and complex types
- Field documentation in interfaces: `/** JWT from verify-telegram Edge Function */`
- Important behavioral notes: `// Start as loading -- auth runs on mount`
- File-level explanations (see `packages/shared/src/tables.ts`)

**Python JSDoc/Docstrings:**
- Triple-quoted strings
- Single-line: `"""Execute the agent's logic."""`
- Multi-line with usage examples:
```python
"""Async context manager for pipeline tracing.

Usage mirrors ProgressUpdater pattern:

    async with TraceContext("learn", telegram_id=123, user_id=1):
        await runner.run(pipeline_config, ctx)

Automatically captures:
- Pipeline execution timing (both wall-clock and perf_counter)
- Success/failure status
- Trace ID for span correlation
"""
```

**TypeScript JSDoc/TSDoc:**
- JSDoc comments for type documentation: `/** Telegram user ID from initData */`
- Block comments for file-level context (convention notes, important warnings)

## Function Design

**Python Size:**
- Handler functions: 50-200 lines (orchestration logic with multiple phases)
- Service functions: 20-80 lines (focused single responsibility)
- Helper functions: 10-30 lines (utilities like `_sanitize()`, `_extract_json()`)
- Agent run methods: 20-60 lines (LLM interaction + error handling)

**Python Parameters:**
- Type hints required: `async def run(self, input_data: AgentInput, pipeline_ctx: PipelineContext) -> AgentOutput:`
- Return type hints required
- Optional parameters use union type: `image_b64: str | None = None`
- Default values for optional params: `max_size: int = 50000`
- Pydantic models for complex params: `input_data: AgentInput`

**TypeScript Parameters:**
- Type annotations required (strict mode enabled)
- Optional parameters use `?`: `isLoading?: boolean`
- Default values in destructuring: `padding = 'md'`
- Props spread pattern: `...props`
- Destructuring in function signature: `({ className, variant, size, ...props })`

**Python Return Values:**
- Explicit return type hints: `-> dict[str, Any]`, `-> AgentOutput`, `-> bool`
- Pydantic models for structured returns: `AgentOutput(success=True, data=result)`
- Tuples for multiple values: `tuple[int, int, int]` in `format_xp_level()`
- Async functions return `Coroutine[Any, Any, ReturnType]` (implicit)

**TypeScript Return Values:**
- Explicit return types for functions: `: Promise<AuthResult>`
- React components return JSX.Element (implicit)
- Void for side-effect functions (implicit)
- Zustand store methods use `set()` for state updates

## Module Design

**Python Exports:**
- Classes and functions exported by module-level definition (no explicit export)
- `__init__.py` files expose public API:
```python
from bot.tracing.context import TraceContext, traced_span
from bot.tracing.collector import init_collector, get_collector
```
- Private functions (underscore prefix) not imported in `__init__.py`

**TypeScript Exports:**
- Named exports for components: `export const Button = forwardRef<...>(...)`
- Named exports for utilities: `export function cn(...inputs: ClassValue[]) { ... }`
- Type exports: `export type { UserRow, AttemptRow }`
- Default exports for pages: `export default function Dashboard() { ... }`

**Python Barrel Files:**
- Used in package `__init__.py`: `bot/tracing/__init__.py`, `bot/agents/__init__.py`
- Re-exports provide clean public API

**TypeScript Barrel Files:**
- Used for UI components: `packages/webapp/src/shared/ui/index.ts`
- Used for shared types: `packages/shared/src/index.ts` re-exports from multiple files
- Pattern:
```typescript
export type { UserRow, AttemptRow } from './tables';
export type { TrackStatus, AttemptMode } from './enums';
export { XP_PER_LEVEL, RANK_TITLES } from './constants';
```

---

*Convention analysis: 2026-02-02*
