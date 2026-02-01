# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- `src/utils/validations.ts` - camelCase with .ts/.tsx extension
- `src/services/auth/oauth-pkce.service.ts` - kebab-case for multi-word services/managers
- `src/infra/database/database.manager.ts` - descriptive names with pattern suffix
- Component files: `TableSidebar.tsx`, `RecordFormDialog.tsx` - PascalCase for React components
- Test files: `email.test.ts`, `response.test.ts` - filename.test.ts or filename.spec.ts

**Functions:**
- Regular functions: camelCase
- `validateEmail()`, `generateUUID()`, `successResponse()` - verb + noun pattern
- `getPasswordRequirementsMessage()` - descriptive, clear intent
- Private functions: prefix with underscore (if needed)

**Variables:**
- Constants: UPPER_CASE - `SYSTEM_FIELDS`, `IDENTIFIER_REGEX`, `ERROR_CODES`
- Local variables: camelCase - `queryClient`, `emailService`, `oldEnv`, `schemaFields`
- Destructured imports: preserves original case

**Types:**
- Interfaces: PascalCase - `AuthConfigSchema`, `ColumnSchema`, `EmailService`
- Type aliases: PascalCase - `ColumnType` (from shared-schemas)
- Union/literal types: camelCase or UPPER_CASE for enum-like values

## Code Style

**Formatting:**
- Tool: Prettier
- Tab Width: 2 spaces
- Print Width: 100 characters
- Trailing Comma: es5 (arrays/objects only, not function params)
- Quotes: single quotes (`) for regular strings, double quotes (`"`) for JSX

**Prettier Config** (`/.prettierrc`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "endOfLine": "lf",
  "jsxSingleQuote": false
}
```

**Linting:**
- Tool: ESLint with TypeScript support
- Config: `/eslint.config.js` (flat config format)
- Separate configs per workspace: frontend, backend, auth, shared-schemas, mcp
- Key enforced rules:
  - `@typescript-eslint/no-floating-promises: error` - catch unhandled promises
  - `@typescript-eslint/require-await: error` - async functions must use await
  - `@typescript-eslint/no-unused-vars: error` - with underscore prefix allowed
  - `eqeqeq: ['error', 'always']` - strict equality only
  - `curly: ['error', 'all']` - braces required for all blocks
  - `no-console: ['warn', { allow: ['warn', 'error'] }]` - restrict console logs
  - `prefer-const: error` - use const by default
  - `no-var: error` - var is forbidden
  - React: `react/jsx-pascal-case: error` - component names must be PascalCase

## Import Organization

**Order:**
1. Node.js built-ins (`crypto`, `fs`, `path`, `express`)
2. Third-party packages (`react`, `axios`, `zod`, `jose`)
3. Types/Schemas from shared packages (`@insforge/shared-schemas`)
4. Relative imports from same workspace

**Path Aliases:**
- `@/` maps to `./src/` (backend and frontend)
- `@insforge/shared-schemas/` for accessing shared types from other workspaces
- Used for absolute imports to avoid relative path complexity

**Example import block:**
```typescript
import crypto from 'crypto';
import { z } from 'zod';
import { ColumnType, type AuthConfigSchema } from '@insforge/shared-schemas';
import { validateEmail } from '@/utils/validations';
```

## Error Handling

**Patterns:**
- Custom error class: `AppError` (in `src/api/middlewares/error.ts`)
- AppError takes: message, statusCode, errorCode, nextActions
- Errors are thrown from utility/validation functions
- Routes catch errors and pass to error middleware
- Example from `validations.ts`:

```typescript
export function validateIdentifier(identifier: string): boolean {
  if (!identifier || !identifier.trim()) {
    throw new AppError(
      `Invalid identifier name: cannot be empty`,
      400,
      ERROR_CODES.DATABASE_VALIDATION_ERROR,
      `Please provide a valid identifier name`
    );
  }
  return true;
}
```

- Axios errors are caught and re-thrown as AppError with context
- Network errors, auth failures, rate limits have specific error messages

## Logging

**Framework:** Winston logger

**Pattern:** `logger.info()`, `logger.warn()`, `logger.error()`

**Usage:**
- Import as: `import logger from '@/utils/logger';`
- Log level controlled by `LOG_LEVEL` environment variable (default: 'info')
- Only console.warn and console.error allowed by ESLint
- Examples from logs:

```typescript
logger.info('Starting server...');
logger.warn('Deprecated endpoint used');
logger.error('Database connection failed');
```

## Comments

**When to Comment:**
- JSDoc for exported functions and utilities
- Explain WHY not WHAT the code does
- Regex patterns with complexity get block comments
- Example from `validations.ts`:

```typescript
/**
 * Validates PostgreSQL identifier names (tables, columns, etc.)
 * Prevents SQL injection and ensures valid PostgreSQL identifiers
 *
 * Regex breakdown: ^[^"...]+ means entire string must NOT contain:
 * - " (double quotes) - could break SQL queries
 * - \x00-\x1F (ASCII 0-31) - control characters like null, tab, newline
 * - \x7F (ASCII 127) - DEL character
 */
const IDENTIFIER_REGEX = /^[^"\x00-\x1F\x7F]+$/;
```

## JSDoc/TSDoc

**Usage:**
- Document public functions and exports
- Include param types, return type, and purpose
- Examples from utils:

```typescript
/**
 * Generates a user-friendly error message listing all password requirements
 * @param config - Authentication configuration with password requirements
 * @returns A formatted message listing all enabled password requirements
 */
export function getPasswordRequirementsMessage(config: AuthConfigSchema): string {
  // ...
}

/**
 * Validates a PostgreSQL identifier and returns boolean without throwing
 * @param identifier - The identifier to validate
 * @returns true if valid, false if invalid
 */
export function isValidIdentifier(identifier: string): boolean {
  // ...
}
```

## Function Design

**Size:** Generally under 50 lines per function
- Complex logic broken into smaller helper functions
- Services may be larger (database managers, etc.)

**Parameters:**
- Explicit parameters preferred over objects when 2-3 args
- Use object destructuring for many params
- No implicit dependencies (pass what you need)

**Return Values:**
- Explicit return types for public APIs
- Use unions for conditional returns: `boolean | string`
- Void returns for side-effect functions
- Consistent null/undefined handling (throw error instead of returning null)

**Async Functions:**
- Must have explicit `async` keyword
- Must `await` something (enforced by linter)
- Error handling via try-catch or passing to middleware

## Module Design

**Exports:**
- Named exports for most functions and classes
- Default exports only for top-level modules (pages, routes)
- Services exported as singletons (getInstance pattern)

**Barrel Files:**
- Not heavily used, explicit imports preferred
- Routes use barrel exports: `export * from './submodule.routes.js'`

**Service Pattern:**
Example from token manager:
```typescript
export class TokenManager {
  private static instance: TokenManager;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }
  // ...
}
```

## TypeScript

**Configuration:**
- Backend: `backend/tsconfig.json` - Node.js target
- Frontend: `frontend/tsconfig.json` - DOM lib included
- `strict: true` mode enabled
- `module: esnext` for ESM compatibility

**Type Annotations:**
- Required for function parameters and returns
- Optional for locally inferred variables
- Use `type` imports for types: `import type { AuthConfigSchema }`
- Any usage warned/errored depending on context

---

*Convention analysis: 2026-02-01*
