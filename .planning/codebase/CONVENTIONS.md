# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- React components: PascalCase, e.g., `Button.tsx`, `AuthProvider.tsx`, `Dashboard.tsx`
- Hooks: camelCase with `use` prefix, e.g., `useAuth.ts`, `useBackButton.ts`, `useSessionResilience.ts`
- Utilities/helpers: camelCase, e.g., `cn.ts`, `telegram.ts`, `insforge.ts`
- Stores: camelCase with `store` suffix, e.g., `store.ts`
- Type definitions: exported from feature/package index or alongside implementation
- Directory names: camelCase for features, kebab-case for shared directories, e.g., `shared/ui`, `shared/lib`, `shared/hooks`, `shared/layouts`

**Functions:**
- Async functions that fetch/verify data: `authenticate...`, `verify...`, e.g., `authenticateWithTelegram()`
- Hook factories/creators: `create...`, e.g., `createAuthenticatedClient()`
- Getters: `get...`, e.g., `getInsforge()`
- Component render functions: PascalCase (React convention)
- Helper utilities: camelCase descriptive, e.g., `cn()` for className utility

**Variables:**
- React component props: Interface extends standard HTML attributes, suffixed with `Props`, e.g., `ButtonProps`, `CardProps`, `AuthProviderProps`
- Store state: camelCase with clear intent, e.g., `jwt`, `telegramId`, `userId`, `isLoading`, `isAuthenticated`
- Constants: UPPER_SNAKE_CASE for numeric/static constants, e.g., `XP_PER_LEVEL`, `PASSING_SCORE`, `MAX_LEVEL`
- Environment variables: VITE_ prefix (Vite convention), e.g., `VITE_INSFORGE_URL`, `VITE_INSFORGE_ANON_KEY`

**Types:**
- Database row types: Suffix `Row`, e.g., `UserRow`, `AttemptRow`, `LeadRegistryRow`
- Enums/literal unions: Descriptive names, often suffixed with type, e.g., `TrackStatus`, `AttemptMode`, `LeadStatus`
- Generic interfaces: Export from shared package, mirrored from database schemas
- JSDoc interfaces: Include detailed comments explaining purpose and field meanings

## Code Style

**Formatting:**
- Language: TypeScript 5.9+
- Build tool: Vite 7.3
- Target: ES2020
- Module: ESNext
- No explicit formatter configuration (implicit sensible defaults)
- Strict mode: Enabled (`"strict": true`)

**Linting:**
- Tool: TypeScript strict compiler (enforced via tsconfig)
- Key rules:
  - `noUnusedLocals: true` — unused variables are errors
  - `noUnusedParameters: true` — unused function parameters are errors
  - `noFallthroughCasesInSwitch: true` — switch cases must have break/return
  - `forceConsistentCasingInFileNames: true` — case-sensitive imports
  - `strict: true` — all strictness checks enabled

**CSS:**
- Framework: Tailwind CSS 4.1 with vite plugin
- Styling approach: Utility-first with custom design tokens (colors via CSS variables)
- Component styling: Inline Tailwind classes or `cn()` utility for conditional classes
- CVA usage: class-variance-authority for component variant management (Button, Badge, Card variants)

## Import Organization

**Order:**
1. React and React libraries (`react`, `react-router`, etc.)
2. Third-party libraries (`zustand`, `@tanstack/react-query`, `class-variance-authority`, etc.)
3. InsForge/shared types and utilities (`@insforge/sdk`, `@deal-quest/shared`)
4. Internal absolute imports (via path aliases)
5. Type imports: `import type { ... }` separate from default imports

**Path Aliases:**
- `@/*` → `./src/*` (configured in tsconfig.json)
- Usage: `import { Button } from '@/shared/ui'`, `import { useAuthStore } from '@/features/auth/store'`
- Do NOT use relative paths in same-package imports; always use `@/` alias

**Example pattern from `src/main.tsx`:**
```typescript
import '@/app/globals.css';
import { createRoot } from 'react-dom/client';
import { initTelegramSDK } from '@/lib/telegram';
import App from '@/app/App';
```

## Error Handling

**Patterns:**
- Async errors: Use `try`/`catch` with typed error messages
- React component errors: Components render error UI (not thrown)
- Auth errors: Caught in effect, stored in Zustand state, displayed as UI
- Validation errors: Expected/handled gracefully with user feedback
- Edge Function calls: Check response structure (`error || !data?.jwt`), throw with descriptive message

**Error reporting:**
```typescript
// In useAuth.ts
if (error || !data?.jwt) {
  throw new Error(error?.message || 'Authentication failed: no JWT returned');
}

// In AuthProvider.tsx
.catch((err: Error) => {
  console.error('[AuthProvider] Authentication failed:', err);
  setError(err.message);
});

// Error state displays in UI
if (error) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-2 px-4">
      <div className="text-red-500 text-sm font-medium">Authentication Error</div>
      <div className="text-text-hint text-xs text-center max-w-sm">{error}</div>
    </div>
  );
}
```

## Logging

**Framework:** console (native)

**Patterns:**
- Use bracketed prefixes for module context: `[AuthProvider]`, `[AUTH]`, etc.
- Levels:
  - `console.error()` — authentication failures, critical errors
  - `console.warn()` — degraded scenarios (validation query fails but auth succeeds)
  - `console.info()` — successful operations like auth validation
  - `console.log()` — not used in codebase (use info/error/warn)

**When to log:**
- Auth flow: Log at each major step (success, failure, validation)
- Errors: Always log with context
- API responses: Log failures and validation results
- Do NOT log during normal component render/state updates

**Example from `useAuth.ts`:**
```typescript
console.error('[AUTH] Validation query failed:', testError);
console.info('[AUTH] Authenticated successfully. Validation query returned:', testData);
console.warn('[AUTH] Validation query threw:', validationErr, '-- proceeding with auth anyway');
```

## Comments

**When to Comment:**
- Complex authentication flows: Explain multi-step processes
- Design decisions: Why a pattern was chosen over alternatives
- Provider ordering: Document why providers wrap in specific order
- Type definitions: Document JSONB field structures and edge cases
- Async operations: Explain error handling strategy

**JSDoc/TSDoc:**
- Functions: Use JSDoc for public functions explaining params, return type, and errors
- Stores: Document state fields with inline comments explaining purpose and validation
- Types: Document complex types and JSONB structures
- Do NOT document obvious parameters (e.g., `children: ReactNode` needs no comment)

**Example pattern from `store.ts`:**
```typescript
interface AuthState {
  /** JWT from verify-telegram Edge Function */
  jwt: string | null;
  /** Telegram user ID from initData */
  telegramId: number | null;
  /** InsForge database user ID */
  userId: number | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
}
```

## Function Design

**Size:** Keep functions small and focused. Single responsibility.
- Auth functions: 30-50 lines (single flow)
- Component render: 20-40 lines (simple layout)
- Hooks: 10-25 lines (single effect)

**Parameters:**
- Props interface for React components: Extend standard HTML attributes, add custom props
- Function parameters: Max 3 positional params; use object for more
- Always use TypeScript types (never `any`)

**Return Values:**
- Async functions: Return typed objects or throw
- Components: Return ReactNode/JSX.Element
- Hooks: Return single value or object of {state, actions}
- Error cases: Throw descriptive Error, don't return null/undefined for failures

**Example from `useAuth.ts`:**
```typescript
export async function authenticateWithTelegram(): Promise<AuthResult> {
  const { initDataRaw } = retrieveLaunchParams();

  if (!initDataRaw) {
    throw new Error('No initData available. Are you running inside Telegram?');
  }

  // ... validate, call Edge Function, return typed result
  return {
    jwt: data.jwt,
    user: data.user,
  };
}
```

## Module Design

**Exports:**
- Modules export single primary entity (component, hook, or utility)
- Types exported alongside or from shared package
- Barrel files: Use `index.ts` to re-export related exports (e.g., `shared/ui/index.ts`)

**Barrel Files:**
- Location: `shared/ui/index.ts`, `features/*/index.ts` (if needed)
- Pattern: Re-export named exports and their types
- Example from `shared/ui/index.ts`:
  ```typescript
  export { Button, type ButtonProps } from './Button';
  export { Card, type CardProps } from './Card';
  export { Badge, type BadgeProps } from './Badge';
  ```

**Internal structure:**
- Keep business logic out of components
- Store state in Zustand stores (`features/auth/store.ts`)
- Data fetching logic in hooks (`features/auth/useAuth.ts`)
- Shared utilities in `shared/lib/` (e.g., `cn()` for classNames)
- Providers at app root to wrap children with context

## Monorepo Structure

**Packages:**
- `@deal-quest/webapp` — React TMA application (main user-facing code)
- `@deal-quest/shared` — Shared types and constants (database schemas, enums, game constants)

**Import pattern:**
- Within webapp: Use `@/` alias for local imports
- Between packages: Use package name (`@deal-quest/shared`) in dependencies
- Shared exports: Always use barrel exports from `src/index.ts`

---

*Convention analysis: 2026-02-02*
