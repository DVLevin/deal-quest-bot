# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Status:** Not yet implemented

**Current state:**
- No test files exist in the codebase (0 `.test.ts`, `.spec.ts`, `.test.tsx`, `.spec.tsx` files)
- No testing framework configured (no jest.config, vitest.config, or test runner in package.json)
- No testing dependencies in webapp or shared packages

**Implications:**
- TypeScript compilation validation only (via `tsc --noEmit`)
- All code must be manually tested
- No automated regression detection
- Integration testing relies on manual Telegram TMA testing

## Recommended Testing Setup

**For future implementation, recommend:**

**Test Runner:** Vitest (modern, fast, works well with Vite)
- Already using Vite, so Vitest integrates seamlessly
- Async/await support for testing async auth flows
- Good TypeScript support

**Assertion Library:** Vitest built-in + `@testing-library/react` for components
- Component testing via React Testing Library (user-centric)
- Mock Telegram SDK and InsForge client

**Run Commands (to be implemented):**
```bash
npm run test                # Run all tests once
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
```

## Current Validation Approach

**TypeScript Compilation:**
- Location: `packages/webapp/tsconfig.json`, `packages/shared/tsconfig.json`
- Config: `tsc --noEmit` in package.json scripts
- Enforcement:
  - `strict: true` — all strict checks
  - `noUnusedLocals: true` — unused variables caught
  - `noUnusedParameters: true` — unused params caught
  - Path aliases must resolve correctly

**Manual Testing Strategy:**

**Authentication Flow:**
- Run Telegram bot in development mode
- Test Telegram Web App launch
- Verify `initDataRaw` retrieval
- Check verify-telegram Edge Function call
- Validate JWT storage and client configuration
- Test InsForge database query validation

**Component Testing:**
```bash
npm run dev  # Start Vite dev server
# Manually test each route in TMA
# - Navigation between pages
# - Auth state persistence
# - Error states and recovery
# - TanStack Query caching behavior
```

**Integration Testing:**
- Manual TMA testing covers:
  - AuthProvider → verify-telegram → JWT → authenticated client
  - QueryProvider → TanStack Query caching
  - Router → lazy-loaded pages
  - Telegram SDK integration (BackButton, MainButton, etc.)

## Code Patterns Ready for Testing

**Auth Hook - Easy to test:**
Location: `packages/webapp/src/features/auth/useAuth.ts`

```typescript
// Can be tested with:
// 1. Mock retrieveLaunchParams to return test initDataRaw
// 2. Mock insforgeAnon.functions.invoke to return JWT
// 3. Assert createAuthenticatedClient called with correct JWT
// 4. Assert validation query executes
// 5. Assert error handling on various failure modes
```

**Store - Very easy to test:**
Location: `packages/webapp/src/features/auth/store.ts`

```typescript
// Zustand store is a pure function, trivial to test:
// 1. Create store instance
// 2. Call setAuth() and assert state updates
// 3. Call clearAuth() and assert state reset
// 4. Test each action produces expected state
// 5. No mocks needed for basic store tests
```

**Components - Requires React Testing Library:**
Location: `packages/webapp/src/shared/ui/Button.tsx`, etc.

```typescript
// Component tests should verify:
// 1. Renders with correct className variants
// 2. Props correctly apply to underlying element
// 3. isLoading prop shows spinner
// 4. disabled prop prevents interaction
// 5. onClick handler fires
// 6. Accessibility (aria-hidden on spinner, etc.)
```

**Providers - Requires Router and mocks:**
Location: `packages/webapp/src/app/providers/AuthProvider.tsx`

```typescript
// Provider tests need:
// 1. Mock useAuthStore for different auth states
// 2. Mock authenticateWithTelegram for success/failure
// 3. Assert loading state renders during auth
// 4. Assert error state renders when auth fails
// 5. Assert children render only when authenticated
```

## Test Coverage Targets (Future)

**Priority order for initial test suite:**

1. **Auth module (95%+ coverage):**
   - `useAuth.ts` — all success/error paths
   - `store.ts` — all store mutations
   - `AuthProvider.tsx` — loading, error, success states

2. **Shared utilities (100% coverage):**
   - `shared/lib/cn.ts` — class merging logic
   - All utility functions

3. **UI Components (80%+ coverage):**
   - Button variants (all sizes, variants, loading state)
   - Card component (padding variants, polymorphic component)
   - Badge component (all variants)

4. **Integration (manual + E2E):**
   - Full auth flow (via Telegram SDK mock)
   - Page navigation
   - TanStack Query caching behavior

5. **Optional (Nice to have):**
   - Individual pages
   - Custom hooks
   - Error boundaries

## Mocking Strategy (When Implemented)

**Telegram SDK:**
```typescript
// Mock @telegram-apps/sdk-react
vi.mock('@telegram-apps/sdk-react', () => ({
  retrieveLaunchParams: vi.fn(() => ({
    initDataRaw: 'test-init-data-raw',
  })),
  // ... other Telegram functions
}));
```

**InsForge Client:**
```typescript
// Mock @insforge/sdk
vi.mock('@insforge/sdk', () => ({
  createClient: vi.fn(() => ({
    functions: {
      invoke: vi.fn(async (fnName, opts) => {
        if (fnName === 'verify-telegram') {
          return {
            data: { jwt: 'test-jwt', user: { id: 1, telegram_id: 123 } },
            error: null,
          };
        }
      }),
    },
    database: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: [{ id: 1, telegram_id: 123 }],
              error: null,
            })),
          })),
        })),
      })),
    },
    getHttpClient: vi.fn(() => ({
      setAuthToken: vi.fn(),
    })),
  })),
}));
```

**TanStack Query:**
```typescript
// Can be tested with QueryClient directly, no mock needed:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60_000, retry: 1 },
  },
});

// Tests wrap components in QueryClientProvider(client={queryClient})
```

## What NOT to Mock

- **Zustand stores** — use real store in tests
- **React Router** — use real router for navigation tests (wrap in MemoryRouter)
- **Tailwind CSS classes** — test className values, not rendered styles
- **Utils like `cn()`** — test directly with real input

## Testing Gaps

**Current untested areas:**

1. **Authentication flow** — Most critical
   - No automated verification of JWT flow
   - No test of Edge Function integration
   - No test of session resilience

2. **Router and navigation** — No test of:
   - Page transitions
   - Lazy loading behavior
   - BackButton integration

3. **UI Components** — No regression tests for:
   - Button variants and states
   - Card layouts
   - Responsive behavior

4. **Error handling** — No automated tests for:
   - Network failures
   - Invalid auth responses
   - Telegram SDK initialization failures

5. **State management** — No tests of:
   - Zustand store mutations
   - Store selectors
   - State persistence across navigation

## Manual Testing Checklist (Until Automated Tests)

**Before deploying, manually verify:**

**Auth:**
- [ ] Telegram TMA launches successfully
- [ ] initDataRaw is retrieved
- [ ] verify-telegram Edge Function returns JWT
- [ ] InsForge client accepts JWT
- [ ] Database queries work with authenticated client
- [ ] Logout/session expiry handled gracefully

**Navigation:**
- [ ] All 8 routes load
- [ ] Page skeletons display during lazy load
- [ ] BackButton syncs with browser back
- [ ] No console errors during navigation

**UI:**
- [ ] All components render without errors
- [ ] Buttons are clickable and respond to state
- [ ] Cards display content correctly
- [ ] Loading states show spinners
- [ ] Error states display error messages

**Performance:**
- [ ] Pages load quickly
- [ ] TanStack Query caches between routes
- [ ] No memory leaks from effects

---

*Testing analysis: 2026-02-02*
