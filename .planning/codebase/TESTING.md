# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config files:
  - Backend: `backend/vitest.config.ts`
  - Frontend: `frontend/vitest.config.ts`

**Assertion Library:**
- Vitest built-in (uses standard expect syntax)

**Run Commands:**
```bash
npm run test              # Run all tests in workspace
npm run test:watch       # Watch mode (all packages)
npm run test:coverage    # Generate coverage reports

# Backend specific
cd backend && npm run test
cd backend && npm run test:watch
cd backend && npm run test:coverage

# Frontend specific
cd frontend && npm run test
cd frontend && npm run test:ui       # Vitest UI
cd frontend && npm run test:coverage
```

## Test File Organization

**Backend Tests:**
- Location: `backend/tests/unit/` for unit tests
- Naming: `*.test.ts` (not .spec.ts)
- Single file per module: `email.test.ts`, `response.test.ts`, `validations.test.ts`

**Frontend Tests:**
- Location: TBD (no frontend tests found in codebase)
- Would follow: `src/**/*.test.tsx` co-located pattern

**Test Structure:**
```
backend/
├── tests/
│   ├── unit/              # Unit tests for services, utilities
│   │   ├── email.test.ts
│   │   ├── response.test.ts
│   │   ├── validations.test.ts
│   │   └── ...
│   ├── setup.ts           # Global test setup
│   └── verify-bootstrap-import.js
└── src/
```

## Test Structure

**Suite Organization:**
All tests use Vitest's `describe` and `it` structure:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(async () => {
    // Setup before each test
    vi.resetAllMocks();
    emailService = EmailService.getInstance();
  });

  afterEach(() => {
    // Cleanup after each test
    process.env = oldEnv;
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = EmailService.getInstance();
      const instance2 = EmailService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendWithTemplate', () => {
    it('successfully sends email with template', async () => {
      // Test body
    });
  });
});
```

**Patterns:**
- One top-level `describe` per class/module
- Nested `describe` blocks for method grouping
- Each `it` is one test case with one primary assertion
- `beforeEach`/`afterEach` for test isolation
- Descriptive test names starting with verb: "successfully sends", "throws error", "handles X"

## Mocking

**Framework:** Vitest's `vi` module

**Patterns:**
Module mocking with `vi.mock()`:
```typescript
vi.mock('axios');
vi.mock('jsonwebtoken');
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
```

Function spying and mocking:
```typescript
// Mock return value
(jwt.sign as unknown as ReturnType<typeof vi.fn>).mockReturnValue('mocked-jwt-token');

// Mock resolved value for async
vi.mocked(axios.post).mockResolvedValue({
  data: { success: true },
});

// Mock rejected value
vi.mocked(axios.post).mockRejectedValue(error);

// Spy on function
const logSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
expect(logSpy).toHaveBeenCalled();
logSpy.mockRestore();
```

**What to Mock:**
- External HTTP calls (axios, fetch)
- JWT signing/verification
- Logger calls
- External service configuration
- Environment variables (save/restore in beforeEach/afterEach)

**What NOT to Mock:**
- Core business logic being tested
- Database queries (use in-memory or test DB)
- Input validation (test real behavior)
- Utility functions like `convertSqlTypeToColumnType`

## Fixtures and Factories

**Test Data:**
Simple test data defined inline or in test helpers:
```typescript
// From response.test.ts
const data = { message: 'ok' };
const error = 'ERROR';
const message = 'Something went wrong';

// From email.test.ts
const templateVariables = { token: '123456' };
const email = 'user@example.com';
const name = 'John Doe';
```

**Factory Pattern:**
Not heavily used. Tests create instances directly:
```typescript
beforeEach(async () => {
  const { config } = await import('../../src/app.config');
  config.cloud.projectId = 'test-project-123';
  emailService = EmailService.getInstance();
});
```

**Location:**
- No separate fixtures directory
- Test data inline in test file
- Environment setup in `tests/setup.ts`

## Coverage

**Requirements:** Not enforced at commit level

**Frontend Coverage Thresholds** (from `frontend/vitest.config.ts`):
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/mockData.ts',
    'src/main.tsx',
  ],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60,
  },
}
```

**Backend Coverage:**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'dist/', 'frontend/', 'tests/', '**/*.d.ts', '**/*.config.*'],
}
```

**View Coverage:**
```bash
npm run test:coverage    # Generates coverage reports
# HTML report: coverage/index.html
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, services, utilities
- Location: `backend/tests/unit/`
- Files: 13 test files covering:
  - Email service integration
  - Response utility functions
  - Password/identifier validation
  - SQL type conversion
  - Logger behavior
  - Rate limiting
  - Cloud token verification
  - Database parsing
  - Environment configuration
- Approach: Mock external dependencies, test function behavior with various inputs

Example from `validations.test.ts`:
```typescript
describe('validateEmail', () => {
  test('valid email returns true', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  test('invalid email returns false', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

**Integration Tests:**
- Not present in current test suite
- Would test service interactions (email + auth flow)
- Would use real or test database

**E2E Tests:**
- Framework: Not detected
- Command: `npm run test:e2e` exists but implementation in `./tests/run-all-tests.sh`
- Not actively maintained in main test suite

## Common Patterns

**Async Testing:**
All async tests use async/await with expect().rejects pattern:
```typescript
it('throws error if PROJECT_ID is not configured', async () => {
  const { config } = await import('../../src/app.config');
  config.cloud.projectId = 'local';

  await expect(
    emailService.sendWithTemplate('user@example.com', 'John', 'email-verification-code', {
      token: '123456',
    })
  ).rejects.toThrow(AppError);

  await expect(
    emailService.sendWithTemplate('user@example.com', 'John', 'email-verification-code', {
      token: '123456',
    })
  ).rejects.toThrow('PROJECT_ID is not configured');

  // Reset for other tests
  config.cloud.projectId = 'test-project-123';
});
```

**Error Testing:**
Test both error type and message:
```typescript
it('throws error for invalid template type', async () => {
  await expect(
    emailService.sendWithTemplate(
      'user@example.com',
      'John',
      '123456',
      'invalid-template' as any  // Type cast for testing invalid input
    )
  ).rejects.toThrow('Invalid template type');
});
```

Specific error handling:
```typescript
it('handles 401 authentication error', async () => {
  const error = new Error('Request failed') as any;
  error.isAxiosError = true;
  error.response = {
    status: 401,
    data: { message: 'Unauthorized' },
  };

  vi.mocked(axios.post).mockRejectedValue(error);
  vi.mocked(axios.isAxiosError).mockReturnValue(true);

  await expect(
    emailService.sendWithTemplate('user@example.com', 'John', 'email-verification-code', {
      token: '123456',
    })
  ).rejects.toThrow('Authentication failed with cloud email service');
});
```

**Singleton Testing:**
Tests verify singleton pattern works:
```typescript
describe('getInstance', () => {
  it('returns singleton instance', () => {
    const instance1 = EmailService.getInstance();
    const instance2 = EmailService.getInstance();
    expect(instance1).toBe(instance2);
  });
});
```

**Mock Spy Assertions:**
From `response.test.ts`:
```typescript
it('successResponse returns data with correct status', () => {
  const data = { message: 'ok' };
  successResponse(res as Response, data, 201);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(data);
});
```

## Test Setup

**Backend Setup File** (`backend/tests/setup.ts`):
```typescript
import { beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

// Clean up test database before each test
beforeEach(async () => {
  const testDataDir = './test-data';
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch {
    // Directory might not exist, that's ok
  }
});

// Clean up after all tests
afterEach(async () => {
  const testDataDir = './test-data';
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch {
    // Directory might not exist, that's ok
  }
});
```

**Backend vitest.config.ts Key Settings:**
```typescript
test: {
  environment: 'node',
  globals: true,          // describe, it, expect available globally
  setupFiles: ['./tests/setup.ts'],
  testTimeout: 10000,
  // Run tests sequentially to avoid database conflicts
  pool: 'forks',
  poolOptions: {
    forks: {
      singleFork: true,   // Single worker to prevent race conditions
    },
  },
}
```

**Frontend vitest.config.ts Key Settings:**
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  css: true,
}
```

## Testing Best Practices

**In This Codebase:**
- Tests reset mocks in beforeEach to prevent test pollution
- Environment variables saved/restored per test
- Descriptive test names that read like documentation
- One assertion per test or grouped related assertions
- Mock configuration done via vi.mock() at top level
- TypeScript `as unknown as` used to safely cast mocks
- Comments with eslint-disable for intentional type violations (e.g., testing invalid input)

---

*Testing analysis: 2026-02-01*
