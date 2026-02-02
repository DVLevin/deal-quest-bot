# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Python:**
- No test framework detected in dependencies
- `requirements.txt` does not include pytest, unittest, or other testing frameworks
- No test files found in `bot/` directory structure

**TypeScript:**
- No test framework detected in package.json
- No Vitest, Jest, or Mocha configuration files found
- No test files (*.test.ts, *.spec.ts) found in `packages/webapp/src/` or `packages/shared/src/`

**Run Commands:**
```bash
# No test commands configured
# Neither package.json nor requirements.txt include testing scripts
```

## Test File Organization

**Location:**
- No test files present in codebase

**Expected Future Organization:**
- Python: tests could follow pytest convention with `tests/` directory or `test_*.py` files co-located
- TypeScript: tests would likely use `*.test.ts` or `*.spec.ts` co-located with source files

**Structure:**
- Not applicable (no tests present)

## Test Structure

**Suite Organization:**
Not applicable - no tests present in codebase.

**Expected Pattern (Python):**
```python
# Future pytest pattern
import pytest
from bot.services.llm_router import create_provider

@pytest.fixture
def mock_api_key():
    return "test_key_12345"

def test_create_provider_claude(mock_api_key):
    provider = create_provider("claude", mock_api_key, "claude-sonnet-4")
    assert provider is not None
    assert provider.name == "claude"
```

**Expected Pattern (TypeScript):**
```typescript
// Future Vitest pattern
import { describe, it, expect } from 'vitest';
import { cn } from '@/shared/lib/cn';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('base', 'override');
    expect(result).toBe('base override');
  });
});
```

## Mocking

**Framework:** Not applicable - no testing framework present

**Expected Patterns:**

Python (pytest):
```python
# Mock httpx for LLM API calls
@pytest.mark.asyncio
async def test_llm_router_retry_logic(mocker):
    mock_post = mocker.patch('httpx.AsyncClient.post')
    mock_post.side_effect = [
        httpx.HTTPStatusError("500", request=..., response=...),
        httpx.Response(200, json={"content": [{"text": "success"}]})
    ]

    provider = ClaudeProvider(api_key="test", model="claude-sonnet-4")
    result = await provider.complete("system", "user")

    assert mock_post.call_count == 2
    assert result["analysis"] is not None
```

TypeScript (Vitest):
```typescript
// Mock InsForge SDK calls
import { vi } from 'vitest';

vi.mock('@insforge/sdk', () => ({
  createClient: vi.fn(() => ({
    database: {
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  })),
}));
```

**What to Mock:**
- HTTP calls (httpx in Python, fetch/InsForge SDK in TypeScript)
- LLM API interactions (Claude, OpenRouter)
- Database operations (InsForge client)
- File system operations (reading prompts, scenarios)
- Telegram Bot API calls (aiogram)
- External services (AssemblyAI transcription)

**What NOT to Mock:**
- Pydantic model validation
- Pure utility functions (formatting, calculations)
- Type definitions and constants
- Configuration parsing (test with real Pydantic Settings)

## Fixtures and Factories

**Test Data:**
Not applicable - no tests present.

**Expected Pattern (Python):**
```python
# bot/tests/fixtures.py
import pytest
from bot.storage.models import UserModel, AttemptModel

@pytest.fixture
def sample_user():
    return UserModel(
        telegram_id=123456789,
        username="testuser",
        provider="openrouter",
        total_xp=500,
        current_level=3
    )

@pytest.fixture
def sample_attempt():
    return AttemptModel(
        telegram_id=123456789,
        scenario_id="sales_101",
        mode="practice",
        score=75,
        xp_earned=50
    )
```

**Expected Pattern (TypeScript):**
```typescript
// packages/webapp/src/test/factories.ts
import type { UserRow } from '@deal-quest/shared';

export function createMockUser(overrides?: Partial<UserRow>): UserRow {
  return {
    id: 1,
    telegram_id: 123456789,
    username: 'testuser',
    first_name: 'Test',
    provider: 'openrouter',
    encrypted_api_key: null,
    openrouter_model: 'openai/gpt-oss-120b',
    total_xp: 500,
    current_level: 3,
    streak_days: 5,
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
```

**Location:**
- Would be in `bot/tests/fixtures.py` for Python
- Would be in `packages/webapp/src/test/factories.ts` for TypeScript

## Coverage

**Requirements:** Not enforced - no coverage tooling configured

**Expected Setup (Python):**
```bash
# Install pytest-cov
pip install pytest pytest-cov

# Run with coverage
pytest --cov=bot --cov-report=html --cov-report=term

# View coverage report
open htmlcov/index.html
```

**Expected Setup (TypeScript):**
```bash
# Vitest includes coverage via v8 or istanbul
npm install -D vitest @vitest/coverage-v8

# Run with coverage
npm run test:coverage

# View report
open coverage/index.html
```

**View Coverage:**
Not applicable - no coverage configuration present

## Test Types

**Unit Tests:**
- Not present in codebase
- Would test:
  - Python: Individual agent logic (`bot/agents/strategist.py`, `bot/agents/trainer.py`)
  - Python: Service layer (`bot/services/llm_router.py`, `bot/services/scoring.py`)
  - Python: Utilities (`bot/utils.py` formatting functions)
  - TypeScript: UI components (`packages/webapp/src/shared/ui/Button.tsx`)
  - TypeScript: Hooks (`packages/webapp/src/features/auth/useAuth.ts`)

**Integration Tests:**
- Not present in codebase
- Would test:
  - Python: Pipeline execution end-to-end (`bot/pipeline/runner.py`)
  - Python: InsForge repository operations (`bot/storage/repositories.py`)
  - Python: Telegram handler flows (`bot/handlers/support.py`, `bot/handlers/learn.py`)
  - TypeScript: Page-level interactions with mocked backend

**E2E Tests:**
- Not present in codebase
- Would test:
  - Full bot conversation flows via Telegram API
  - TMA user journeys (login → support → save lead)
  - Edge function integration

## Common Patterns

**Async Testing (Python):**
Expected pattern using pytest-asyncio:
```python
import pytest

@pytest.mark.asyncio
async def test_pipeline_runner_sequential():
    """Test sequential step execution in pipeline."""
    registry = AgentRegistry()
    runner = PipelineRunner(registry)

    config = load_pipeline("support")
    ctx = PipelineContext(
        user_message="Help with deal",
        llm=mock_provider,
        knowledge_base="Test KB"
    )

    results = await runner.run(config, ctx)
    assert results["strategist"].success is True
```

**Async Testing (TypeScript):**
Expected pattern using Vitest:
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('authenticateWithTelegram', () => {
  it('successfully authenticates with valid initData', async () => {
    vi.mock('@telegram-apps/sdk-react', () => ({
      retrieveLaunchParams: () => ({ initDataRaw: 'mock_data' }),
    }));

    const result = await authenticateWithTelegram();

    expect(result.jwt).toBeDefined();
    expect(result.telegramId).toBeGreaterThan(0);
  });
});
```

**Error Testing (Python):**
Expected pattern:
```python
def test_llm_router_invalid_provider():
    """Test error handling for unsupported provider."""
    with pytest.raises(ValueError, match="Unsupported provider"):
        create_provider("invalid_provider", "key", "model")

@pytest.mark.asyncio
async def test_agent_handles_llm_failure():
    """Test agent gracefully handles LLM errors."""
    agent = StrategistAgent()
    mock_llm = Mock()
    mock_llm.complete.side_effect = Exception("API Error")

    input_data = AgentInput(user_message="test")
    ctx = PipelineContext(llm=mock_llm)

    output = await agent.run(input_data, ctx)
    assert output.success is False
    assert "API Error" in output.error
```

**Error Testing (TypeScript):**
Expected pattern:
```typescript
describe('Button', () => {
  it('disables button when isLoading is true', () => {
    const { getByRole } = render(<Button isLoading>Click Me</Button>);
    const button = getByRole('button');

    expect(button).toBeDisabled();
  });
});
```

## Test Coverage Gaps

**Untested Areas (as of 2026-02-02):**

**Python Bot (`bot/`):**
- All handler logic (`bot/handlers/*`)
- All agent implementations (`bot/agents/*`)
- All service layer (`bot/services/*`)
- Pipeline orchestration (`bot/pipeline/runner.py`)
- Tracing system (`bot/tracing/*`)
- Repository layer (`bot/storage/repositories.py`)
- Utilities (`bot/utils.py`)

**TypeScript Webapp (`packages/webapp/`):**
- All React components (`src/shared/ui/*`, `src/pages/*`)
- Authentication logic (`src/features/auth/useAuth.ts`)
- State management (`src/features/auth/store.ts`)
- Routing (`src/app/Router.tsx`)

**TypeScript Shared (`packages/shared/`):**
- Type definitions (types don't need runtime tests, but validation logic would)
- Constants and calculations (`src/constants.ts`)

**Edge Functions (`functions/`):**
- Database proxy (`db-proxy.js`)
- Telegram verification (`verify-telegram/`)

**Priority for Testing:**
1. High: Core bot logic (agents, handlers, services) - this is production code handling user interactions
2. High: Pipeline execution and tracing - critical for observability
3. Medium: Repository layer - data integrity matters
4. Medium: UI components - user-facing but easier to test manually
5. Low: Utilities and formatters - simple, low-risk code

## Recommendations

**Set Up Testing Infrastructure:**

Python:
```bash
# Add to requirements.txt
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
httpx>=0.27.0  # Already present, needed for test fixtures
```

TypeScript:
```json
// Add to packages/webapp/package.json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^25.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Testing Strategy:**
1. Start with unit tests for critical path (agent logic, LLM routing)
2. Add integration tests for pipelines
3. Mock external dependencies (Telegram API, LLM APIs, InsForge)
4. Use fixtures for common test data (users, attempts, scenarios)
5. Aim for 70%+ coverage on business logic, lower on UI

---

*Testing analysis: 2026-02-02*
