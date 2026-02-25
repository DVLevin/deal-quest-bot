# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Python Runner:**
- None detected
- No `pytest.ini`, `setup.cfg`, or test files found in `bot/` or root directory
- No test dependencies in `requirements.txt`

**Python Status:**
- **Zero test coverage** — no test infrastructure present

**TypeScript Runner:**
- Framework: Not configured for webapp (`packages/webapp/`)
- InsForge backend has tests: Vitest detected in `insforge/insforge/backend/`
  - Config: `insforge/insforge/backend/tests/unit/*.test.ts`
  - Vitest config: `insforge/insforge/frontend/vitest.config.ts`
- Webapp has no test files or config

**TypeScript Status:**
- **Webapp: Zero test coverage** — no test infrastructure
- InsForge (external dependency) has unit tests, but not relevant to this codebase

**Run Commands:**
```bash
# Python - Not applicable (no tests)

# TypeScript - Not applicable (no tests configured for webapp)
```

## Test File Organization

**Location:**
- Not applicable — no test files exist

**Naming:**
- Not applicable

**Structure:**
- Not applicable

## Test Structure

**Python Suite Organization:**
Not applicable — no tests exist.

**Expected pattern** (based on Python best practices):
```python
# If tests existed, they would follow:
# bot/tests/test_agents.py
# bot/tests/test_storage.py
# bot/tests/test_services.py
# bot/tests/test_handlers.py

import pytest
from bot.agents.base import AgentInput, AgentOutput
from bot.agents.strategist import StrategistAgent

@pytest.mark.asyncio
async def test_strategist_agent_success():
    # Arrange
    agent = StrategistAgent()
    input_data = AgentInput(user_message="test")

    # Act
    result = await agent.run(input_data, mock_context)

    # Assert
    assert result.success is True
```

**TypeScript Suite Organization:**
Not applicable — no tests exist.

**Expected pattern** (based on InsForge reference):
```typescript
// If tests existed, they would follow Vitest pattern:
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorCard } from '@/shared/ui/ErrorCard';

describe('ErrorCard', () => {
  it('renders error message', () => {
    render(<ErrorCard message="Failed to load" />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorCard message="Error" onRetry={onRetry} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
```

## Mocking

**Python Framework:**
Not applicable — no mocking infrastructure detected.

**Expected approach** (based on codebase architecture):
- Mock external dependencies: InsForge client, LLM providers, Telegram Bot API
- Mock repositories for handler tests
- Use `pytest-asyncio` for async test support
- Fixture factories for Pydantic models

**Example (if implemented):**
```python
# bot/tests/conftest.py
import pytest
from unittest.mock import AsyncMock
from bot.storage.insforge_client import InsForgeClient

@pytest.fixture
def mock_insforge_client():
    client = AsyncMock(spec=InsForgeClient)
    client.get.return_value = {"data": [{"id": 1, "telegram_id": 12345}]}
    return client

@pytest.fixture
def mock_llm_provider():
    provider = AsyncMock()
    provider.complete.return_value = {"analysis": "Test analysis"}
    return provider
```

**TypeScript Framework:**
Not applicable — no mocking detected.

**Expected approach** (based on React best practices):
- Mock API calls with Mock Service Worker (MSW) or Vitest mocks
- Mock Telegram SDK: `@telegram-apps/sdk-react`
- Mock InsForge client responses
- Mock React Query for data fetching tests

**Example (if implemented):**
```typescript
// src/test/mocks/insforge.ts
import { vi } from 'vitest';

export const mockInsforge = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [{ id: 1, telegram_id: 12345 }],
        error: null,
      })),
    })),
  })),
};
```

## Fixtures and Factories

**Python Test Data:**
Not applicable — no fixtures exist.

**Expected pattern:**
```python
# bot/tests/fixtures.py (if it existed)
import pytest
from bot.storage.models import UserModel, LeadRegistryModel

@pytest.fixture
def sample_user():
    return UserModel(
        telegram_id=12345,
        username="testuser",
        provider="openrouter",
        total_xp=1000,
        current_level=5,
    )

@pytest.fixture
def sample_lead():
    return LeadRegistryModel(
        telegram_id=12345,
        prospect_name="John Doe",
        prospect_company="Acme Corp",
        prospect_title="VP Sales",
        status="analyzed",
    )
```

**TypeScript Test Data:**
Not applicable — no test data factories exist.

**Expected pattern:**
```typescript
// src/test/factories.ts (if it existed)
export const createMockUser = (overrides = {}) => ({
  id: 1,
  telegram_id: 12345,
  username: 'testuser',
  provider: 'openrouter',
  total_xp: 1000,
  current_level: 5,
  ...overrides,
});

export const createMockLead = (overrides = {}) => ({
  id: 1,
  telegram_id: 12345,
  prospect_name: 'John Doe',
  prospect_company: 'Acme Corp',
  status: 'analyzed',
  ...overrides,
});
```

## Coverage

**Python Requirements:**
None enforced — no coverage tooling detected.

**TypeScript Requirements:**
None enforced — no coverage tooling detected.

**View Coverage:**
```bash
# Not applicable (no tests or coverage tools configured)
```

## Test Types

**Unit Tests:**
- Python: Not present
- TypeScript: Not present
- Expected scope (if implemented):
  - Agent logic (`bot/agents/`)
  - Utility functions (`bot/utils.py`, `bot/utils_validation.py`)
  - Data transformations (`bot/services/scoring.py`, `bot/services/diff_utils.py`)
  - UI components (`packages/webapp/src/shared/ui/`)

**Integration Tests:**
- Python: Not present
- TypeScript: Not present
- Expected scope (if implemented):
  - Pipeline execution (`bot/pipeline/runner.py`)
  - Repository operations with real database
  - LLM provider calls with mocked HTTP responses
  - Full handler flows (command → repository → response)

**E2E Tests:**
- Python: Not present
- TypeScript: Not present
- Expected scope (if implemented):
  - Full bot conversation flows (aiogram testing utilities)
  - Telegram Mini App user journeys (Playwright or Cypress)

## Common Patterns

**Python Async Testing:**
Not implemented.

**Expected pattern:**
```python
import pytest

@pytest.mark.asyncio
async def test_user_repo_get_by_telegram_id(insforge_client_mock):
    # Arrange
    repo = UserRepo(insforge_client_mock)

    # Act
    user = await repo.get_by_telegram_id(12345)

    # Assert
    assert user is not None
    assert user.telegram_id == 12345
```

**Python Error Testing:**
Not implemented.

**Expected pattern:**
```python
import pytest

@pytest.mark.asyncio
async def test_llm_provider_handles_rate_limit():
    # Arrange
    provider = ClaudeProvider(api_key="test")

    # Act & Assert
    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await provider.complete("system", "user")

    assert exc_info.value.response.status_code == 429
```

**TypeScript Async Testing:**
Not implemented.

**Expected pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';

describe('useUserSettings', () => {
  it('fetches user settings', async () => {
    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

**TypeScript Error Testing:**
Not implemented.

**Expected pattern:**
```typescript
import { describe, it, expect } from 'vitest';

describe('getInsforge', () => {
  it('throws when client not authenticated', () => {
    expect(() => getInsforge()).toThrow(
      'InsForge client not authenticated'
    );
  });
});
```

## Testing Gaps

**Critical Untested Areas:**

**Python Bot:**
- `bot/agents/*` — Zero coverage on AI agent logic (including new `extraction.py`, `reanalysis_strategist.py`)
- `bot/pipeline/runner.py` — Pipeline execution not tested
- `bot/storage/repositories.py` — Database operations not tested (11+ repo classes)
- `bot/handlers/*` — Command handlers not tested (11+ handler modules including `context_input.py`, `comment.py`, `reminders.py`)
- `bot/services/llm_router.py` — LLM provider logic not tested
- `bot/services/plan_scheduler.py` — Reminder scheduling not tested (date parsing, escalation logic)
- `bot/services/diff_utils.py` — Analysis diff computation not tested
- `bot/services/image_utils.py` — Image pre-processing not tested
- `bot/utils_validation.py` — Shared validation logic not tested (fuzzy command matching, context-specific messages)
- `bot/task_utils.py` — Background task management not tested
- `bot/tracing/*` — Observability system not tested (spans, traces, collector)

**TypeScript Webapp:**
- `packages/webapp/src/features/*` — Zero coverage on all features
- `packages/webapp/src/shared/ui/*` — UI components not tested (11+ components including new `ErrorBoundary`, `ErrorCard`, `EmptyState`, `Toast`)
- `packages/webapp/src/lib/insforge.ts` — Client initialization not tested
- `packages/webapp/src/app/providers/*` — Auth and Query providers not tested

**Risk Assessment:**
- High risk: Agent pipeline execution (complex async flows, external API dependencies)
- High risk: Database operations (data integrity, error handling)
- High risk: Reminder scheduling logic (`plan_scheduler.py` — date parsing, escalation, auto-snooze)
- High risk: Input validation (`utils_validation.py` — fuzzy command matching could have edge cases)
- High risk: Image processing (`image_utils.py` — dimension calculations, format conversions)
- Medium risk: UI components (user-facing, but type-safe; ErrorBoundary is critical for error handling)
- Medium risk: LLM provider abstraction (retry logic, error handling)
- Medium risk: Background task management (`task_utils.py` — GC prevention, error logging)

**Recommended First Tests:**
1. Python: `utils_validation.py` — Unit tests for `validate_user_input()` and `_check_mistyped_command()` (pure functions, high value)
2. Python: `diff_utils.py` — Unit tests for `compute_analysis_diff()` and `summarize_diff_for_humans()` (pure functions, complex logic)
3. Python: `image_utils.py` — Unit tests for `pre_resize_image()` (file I/O, dimension calculations)
4. Python: `plan_scheduler.py` — Unit tests for `parse_step_due_date()` (complex regex matching, edge cases)
5. Python: Repository unit tests with mocked InsForge client
6. Python: Agent unit tests with mocked LLM responses
7. TypeScript: `ErrorBoundary` — Render tests with error injection
8. TypeScript: `ErrorCard`, `EmptyState`, `Toast` — Snapshot/render tests
9. TypeScript: Hook tests with mocked API responses

## Testing Infrastructure Setup (Recommended)

**Python:**
```toml
# pyproject.toml (to be created)
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["bot/tests"]
python_files = "test_*.py"

[tool.coverage.run]
source = ["bot"]
omit = ["bot/tests/*", "bot/.venv/*"]
```

**Python Dependencies:**
```
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
httpx-mock>=0.15.0
Pillow>=10.0.0  # For image_utils tests
```

**TypeScript:**
```typescript
// vitest.config.ts (to be created)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

**TypeScript Dependencies:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^23.0.0",
    "msw": "^2.0.0"
  }
}
```

---

*Testing analysis: 2026-02-06*
