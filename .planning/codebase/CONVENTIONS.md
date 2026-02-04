# Coding Conventions

**Analysis Date:** 2026-02-04

## Naming Patterns

**Python Files:**
- Snake_case for modules: `llm_router.py`, `config_loader.py`, `insforge_client.py`
- Private/internal modules prefixed with underscore: `_safe_serialize`, `_sanitize`
- Test files: Not present (no testing infrastructure detected)

**TypeScript Files:**
- PascalCase for components: `SettingsPanel.tsx`, `AuthProvider.tsx`, `LeadCard.tsx`
- camelCase for utilities: `insforge.ts`, `cn.ts`
- Page components named after route: `Dashboard.tsx`, `Support.tsx`, `Learn.tsx`

**Python Functions:**
- snake_case: `load_settings()`, `create_provider()`, `get_by_telegram_id()`
- Private functions prefixed with underscore: `_extract_json()`, `_safe_serialize()`, `_sanitize()`
- Async functions use `async def` convention consistently

**TypeScript Functions:**
- camelCase for functions: `createAuthenticatedClient()`, `useUserSettings()`, `handleProviderChange()`
- Custom hooks prefixed with `use`: `useUserSettings`, `useUpdateSettings`, `useDebouncedValue`

**Python Variables:**
- snake_case: `telegram_id`, `user_repo`, `trace_id`, `api_key`
- ALL_CAPS for constants: `MAX_MESSAGE_LENGTH`, `MAX_RETRIES`, `RETRY_DELAYS`
- Private module-level vars with underscore: `_trace_id`, `_span_stack`, `_PROMPT_PATH`

**TypeScript Variables:**
- camelCase: `telegramId`, `insforgeAuth`, `botUsername`
- UPPER_SNAKE_CASE for constants: `INSFORGE_URL`, `INSFORGE_ANON_KEY`, `OPENROUTER_MODELS`

**Python Types/Classes:**
- PascalCase for classes: `UserModel`, `TraceContext`, `BaseAgent`, `LLMProvider`
- Pydantic models suffixed with `Model`: `UserModel`, `AttemptModel`, `PipelineTraceModel`
- Repo classes suffixed with `Repo`: `UserRepo`, `AttemptRepo`, `TraceRepo`
- Abstract base classes use ABC pattern: `BaseAgent`, `LLMProvider`

**TypeScript Types:**
- PascalCase for interfaces/types: `ButtonProps`, `InsForgeClient`, `TrainScenario`
- Props interfaces suffixed with `Props`: `ButtonProps`, `CardProps`, `SkeletonProps`

## Code Style

**Python Formatting:**
- No formatter tool detected (no `.black`, `.ruff`, or `pyproject.toml` with formatter config)
- Manual formatting observed:
  - 4-space indentation
  - Line length ~100-120 characters (not strictly enforced)
  - Type hints used extensively: `str | None`, `dict[str, Any]`, `list[dict[str, Any]]`
  - Modern union syntax: `str | None` instead of `Optional[str]`

**Python Linting:**
- No linter config detected (no `.flake8`, `.pylintrc`, or `ruff.toml`)

**TypeScript Formatting:**
- No explicit formatter config (no `.prettierrc`, `eslint.config.js`)
- Vite + TypeScript strict mode (`strict: true` in `tsconfig.json`)
- 2-space indentation
- Single quotes preferred for strings
- Semicolons omitted

**TypeScript Linting:**
- TypeScript strict mode enabled:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `forceConsistentCasingInFileNames: true`

## Import Organization

**Python Order:**
1. `from __future__ import annotations` (always first)
2. Standard library imports (alphabetically): `asyncio`, `json`, `logging`, `time`, `uuid`
3. Third-party imports: `httpx`, `aiogram`, `pydantic`
4. Local imports: `from bot.agents import`, `from bot.services import`

**Python Path Style:**
- Absolute imports from `bot.` package: `from bot.agents.base import BaseAgent`
- No relative imports used

**TypeScript Order:**
1. External dependencies: `react`, `react-router`, `@telegram-apps/sdk-react`
2. Internal UI components: `@/shared/ui`, `@/features/*/components`
3. Hooks: `@/features/*/hooks`
4. Types: `@/types`, `@deal-quest/shared`
5. Utilities: `@/lib/*`

**TypeScript Path Aliases:**
- `@/*` maps to `./src/*`
- `@deal-quest/shared` maps to `./src/types/index.ts`
- Path aliases configured in `tsconfig.json` and resolved via `vite-tsconfig-paths`

## Error Handling

**Python Patterns:**
- Try/except blocks wrap external API calls (LLM, database, HTTP)
- Specific exceptions caught first, broad exceptions as fallback
- Logging at error level: `logger.error("message: %s", e)`
- Errors propagated upward, not silently swallowed
- Custom exceptions: `TranscriptionError` in `bot/services/transcription.py`
- Return `None` for not-found cases (repository methods)
- Return `AgentOutput(success=False, error=str(e))` for agent failures

**Python Retry Logic:**
- Exponential backoff in `llm_router.py`: `MAX_RETRIES = 3`, `RETRY_DELAYS = [1, 3, 8]`
- Retry on 429, 500, 502, 503 status codes
- Async sleep: `await asyncio.sleep(RETRY_DELAYS[attempt])`

**TypeScript Patterns:**
- Error boundaries not detected (no `ErrorBoundary` component)
- React Query handles API errors via `isError` state
- Client-side validation via TypeScript strict mode
- Throws for uninitialized client: `throw new Error("InsForge client not authenticated")`
- Environment variable validation at module load:
```typescript
if (!INSFORGE_URL) {
  throw new Error('VITE_INSFORGE_URL environment variable is not set');
}
```

## Logging

**Python Framework:**
- Standard library `logging` module
- Logger per module: `logger = logging.getLogger(__name__)`
- Centralized setup in `bot/main.py`:
```python
logging.basicConfig(
    level=getattr(logging, level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    stream=sys.stdout,
)
```

**Python Patterns:**
- Info level for flow: `logger.info("Bot initialized. Starting polling...")`
- Warning for degraded mode: `logger.warning("No OPENROUTER_API_KEY set — engagement features disabled")`
- Error for failures: `logger.error("Claude API error: %s", e)`
- Structured messages with trace IDs: `logger.info("Trace started: trace_id=%s pipeline=%s", trace_id, pipeline_name)`

**TypeScript Framework:**
- `console.log` / `console.error` (no formal logging framework detected)
- Minimal logging observed

## Comments

**Python When to Comment:**
- Module docstrings: Triple-quoted string at top of every file
- Function docstrings: Not consistently used (some functions have docstrings, many don't)
- Inline comments for non-obvious logic: Rare, code mostly self-documenting
- Type hints used instead of comments for parameter/return documentation

**Python Docstring Style:**
- Simple one-liners: `"""Repository classes for database operations."""`
- No structured docstring format (not Google/NumPy/Sphinx style)
- Decorators documented in comments: `# @traced_span decorator comment`

**TypeScript Comments:**
- JSDoc for component-level docs:
```typescript
/**
 * Settings panel for the Profile page.
 *
 * Displays:
 * - Provider selector (OpenRouter vs Claude API)
 * - OpenRouter model selector
 * - API key status with deep-link to bot
 */
```
- Inline comments for configuration: `// Path aliases`, `// Bundler mode`
- Section separators in components: `// ---------------------------------------------------------------------------`

## Function Design

**Python Size:**
- Agent methods: 30-60 lines
- Handler functions: 100-200 lines (long, orchestration-heavy)
- Utility functions: 5-20 lines
- No strict size limit enforced

**Python Parameters:**
- Keyword-only args after `*`: `async def complete(self, system_prompt: str, user_message: str, *, image_b64: str | None = None)`
- Dependency injection via function params (no globals)
- Type hints on all parameters
- Optional parameters with defaults: `model: str = "claude-sonnet-4-20250514"`

**Python Return Values:**
- Explicit return types in signatures: `-> UserModel | None`, `-> dict[str, Any]`
- `None` for not-found or error cases
- Pydantic models for structured data
- Async functions return coroutines: `async def get(...) -> Model | None`

**TypeScript Size:**
- Components: 50-150 lines
- Hooks: 10-30 lines
- Utilities: 10-50 lines

**TypeScript Parameters:**
- Object destructuring for props: `{ className, variant, size, isLoading, disabled, children, ...props }`
- Type inference from generics: `forwardRef<HTMLButtonElement, ButtonProps>`
- Optional parameters with `?`: `isLoading?: boolean`

**TypeScript Return Values:**
- Explicit return types for exported functions: `export function createAuthenticatedClient(_jwt: string): InsForgeClient`
- Hooks return tuples or objects: `const { data, isLoading } = useQuery(...)`
- Components return JSX: `export default function App() { return <div>...</div>; }`

## Module Design

**Python Exports:**
- No explicit `__all__` declarations
- Public API defined by non-underscore names
- Package-level exports via `__init__.py`:
```python
# bot/tracing/__init__.py
from bot.tracing.collector import get_collector, init_collector
from bot.tracing.context import TraceContext, traced_span
```

**Python Barrel Files:**
- Used sparingly: `bot/tracing/__init__.py`, `bot/agents/__init__.py`
- Most imports are direct: `from bot.agents.strategist import StrategistAgent`

**TypeScript Exports:**
- Named exports preferred: `export { Button, type ButtonProps }`
- Default exports for page components: `export default function Dashboard()`
- Barrel files used extensively: `@/shared/ui/index.ts` exports all UI components

**TypeScript Barrel Files:**
- `src/shared/ui/index.ts`: Centralized UI component exports
- Feature-level barrels not used (direct imports from feature directories)

---

*Convention analysis: 2026-02-04*
