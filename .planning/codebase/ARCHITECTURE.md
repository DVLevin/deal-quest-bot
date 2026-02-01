# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Layered architecture with feature-based organization and context-driven state management.

**Key Characteristics:**
- Feature-first modularity with isolated domains (database, auth, storage, realtime, etc.)
- Global state via React Context (Auth, Socket, Modal, Theme, SQL Editor)
- Service layer pattern for API communication
- React Query (TanStack Query) for server state management
- Hook-based composition for component logic
- Barrel exports for encapsulation at feature boundaries

## Layers

**Presentation Layer (Pages & Components):**
- Purpose: User interface rendering and interaction
- Location: `src/features/*/pages/`, `src/components/`
- Contains: Page components, feature-specific UI components, shared UI library
- Depends on: Hooks, contexts, services, utilities
- Used by: Browser/user interaction

**Feature Domain Layer:**
- Purpose: Feature-specific logic and components (database, auth, storage, functions, realtime, etc.)
- Location: `src/features/{feature}/`
- Contains: Pages, components, hooks, services, contexts, templates
- Depends on: Services, shared-schemas, lib contexts
- Used by: Pages, other features via barrel exports

**Hooks & Custom Logic Layer:**
- Purpose: Encapsulate stateful logic and API integration patterns
- Location: `src/lib/hooks/`, `src/features/*/hooks/`
- Contains: React Query hooks (useTables, useRecords, etc.), custom hooks (useAuth, useModal, useToast, useMetadata)
- Depends on: Services, contexts, react-query
- Used by: Components, pages

**Context Layer (Global State):**
- Purpose: Cross-cutting state concerns (auth, socket, modals, theme, SQL editor state)
- Location: `src/lib/contexts/`
- Contains: AuthContext, SocketContext, ModalContext, ThemeContext
- Depends on: Services, API client, utilities
- Used by: App root providers, feature hooks

**Service Layer (API & Business Logic):**
- Purpose: Encapsulate API communication and business logic
- Location: `src/features/*/services/`, `src/lib/services/`
- Contains: Service classes that wrap apiClient requests
- Depends on: apiClient, shared-schemas types
- Used by: Hooks, contexts

**API Client Layer:**
- Purpose: HTTP request orchestration with token management and retry logic
- Location: `src/lib/api/client.ts`
- Contains: ApiClient class (singleton) managing auth headers, CSRF tokens, 401 handling
- Depends on: None (primitive utilities)
- Used by: All services

**Routing & Navigation:**
- Purpose: Application route structure and access control
- Location: `src/lib/routing/`
- Contains: AppRoutes (route definitions), RequireAuth (auth guard)
- Depends on: Contexts, feature pages
- Used by: App component

**Utilities & Helpers:**
- Purpose: Shared functions and constants
- Location: `src/lib/utils/`, `src/features/*/helpers.ts`
- Contains: menuItems, schemaValidations, cloudMessaging, cloudUtils, conversion functions
- Depends on: Types from shared-schemas
- Used by: Throughout application

## Data Flow

**Authentication Flow:**

1. User navigates to `/dashboard/login` → LoginPage component
2. User submits credentials → loginService.loginWithPassword()
3. apiClient sends POST to `/auth/admin/sessions` with email/password
4. Backend returns user, accessToken, csrfToken
5. apiClient.setAccessToken() and apiClient.setCsrfToken() store tokens
6. AuthContext invalidates auth-related queries (tables, users, metadata, mcp-usage)
7. AuthContext state updates (user, isAuthenticated = true)
8. User redirected to `/dashboard`

**Data Fetching (React Query Pattern):**

1. Component mounts or dependency changes → Hook (e.g., useTables)
2. Hook calls tableService.listTables() via React Query queryFn
3. tableService calls apiClient.request('/tables/list')
4. apiClient constructs request with Authorization Bearer header
5. Backend responds with data
6. React Query caches response with staleTime: 2 * 60 * 1000 (2 minutes)
7. Hook returns { data: tables, isLoading, error, refetch }
8. Component renders based on loading/error/data states

**Database Records Update:**

1. User selects table in TableSidebar → TablesPage sets selectedTable
2. useRecords(selectedTable) hook queries `/records/{table}`
3. DatabaseDataGrid renders rows from query cache
4. User submits RecordFormDialog → recordService.createRecord()
5. Service sends POST to `/records/{table}`
6. On success: React Query invalidates ['records', tableName] queryKey
7. useRecords re-fetches latest data automatically
8. DatabaseDataGrid updates with new records

**Real-time Updates (Socket.io):**

1. SocketProvider initializes socket.io connection in App
2. Server emits `data:update` events with resource type and name
3. Socket listener catches event (e.g., DatabaseResourceUpdate)
4. If type === 'records' → invalidates ['records', name] in React Query
5. useRecords() hook automatically re-fetches
6. Component re-renders with fresh data

**SQL Editor State Persistence:**

1. SQLEditorProvider wraps App → initializes from localStorage
2. User adds/edits SQL tab → updateTabQuery() updates local state
3. useEffect triggers debouncedSave (500ms debounce)
4. localStorage.setItem('sql-editor-tabs', JSON.stringify(tabs))
5. On page reload → loadTabsFromStorage() restores state
6. User executes query → useRawSQL() hook sends to backend
7. Results displayed in modal or grid

## Key Abstractions

**Service Classes:**
- Purpose: Encapsulate API endpoints and error handling
- Examples: `tableService`, `recordService`, `databaseService`, `loginService`, `storageService`
- Pattern: Singleton instances exported from service files, called by hooks/contexts
- Example location: `src/features/database/services/table.service.ts`

**Custom Hooks (React Query):**
- Purpose: Bundle data fetching, caching, mutation, and error handling
- Examples: `useTables()`, `useRecords()`, `useCSVImport()`
- Pattern: Hooks return { data, isLoading, error, actions } from useQuery + useMutation combos
- Example location: `src/features/database/hooks/useTables.ts`

**Context Providers:**
- Purpose: Global state and cross-cutting concerns
- Examples: AuthProvider, SocketProvider, ModalProvider, ThemeProvider, SQLEditorProvider
- Pattern: Context + custom hook (useAuth, useSocket, useModal, etc.)
- Example location: `src/lib/contexts/AuthContext.tsx`

**Service Layer Pattern:**
- Purpose: Decouple components from API details
- Pattern: Services wrap apiClient.request(), handle data transformation
- Example: recordService.updateRecords() calls apiClient.request() with computed endpoint

**Zod Schema Validation:**
- Purpose: Runtime type checking and form validation
- Examples: tableFormSchema, tableFormColumnSchema, tableFormForeignKeySchema
- Location: `src/features/database/schema.ts`

## Entry Points

**Application Bootstrap:**
- Location: `src/main.tsx`
- Triggers: Vite starts app
- Responsibilities: Create React root, mount App component into #root

**App Root Component:**
- Location: `src/App.tsx`
- Triggers: Mounted by main.tsx
- Responsibilities: Wrap application with nested providers (Query, Auth, Socket, Toast, Analytics, Modal, SQL Editor), render AppRoutes

**Routing Entry Point:**
- Location: `src/lib/routing/AppRoutes.tsx`
- Triggers: Rendered from App.tsx
- Responsibilities: Define all application routes, wrap protected routes with RequireAuth, nest feature routes under Layout

**Layout Component:**
- Location: `src/components/layout/Layout.tsx`
- Triggers: Wrapped around all authenticated routes
- Responsibilities: Render AppHeader (if not iframe), AppSidebar, main content area, modal overlays

**Feature Pages:**
- Location: `src/features/{feature}/pages/*.tsx`
- Examples: TablesPage, SQLEditorPage, DashboardPage, StoragePage
- Responsibilities: Page-level state (selected tables, forms, filters), compose feature components, call hooks for data

## Error Handling

**Strategy:** Centralized API error handling with context-level reset on 401 Unauthorized.

**Patterns:**

**API Client (src/lib/api/client.ts):**
- Intercepts 401 responses → triggers onRefreshAccessToken() handler if set
- If refresh succeeds → retries original request with new token
- If refresh fails → calls onAuthError() handler (clears tokens, logs out user)
- All other errors → thrown as ApiError with response metadata

**Service Layer:**
- Services wrap apiClient.request() directly without additional error handling
- Hooks (useMutation) catch errors and convert to toast messages

**Hook Error Handling (React Query):**
- useMutation onError: catches service errors → showToast(error.message, 'error')
- useQuery error: stored in { error } state, component conditionally renders <ErrorState />

**Context Error Handling (AuthContext):**
- loginWithPassword catches errors → sets error state
- Returns boolean (true/false) to indicate success
- loginService.setAuthErrorHandler() allows apiClient to notify context of 401

**Component-Level:**
- Pages/components check { isLoading, error } from hooks
- Render LoadingState, ErrorState, or data conditionally
- User-triggered actions (mutations) show inline toast messages

## Cross-Cutting Concerns

**Logging:**
- No centralized logging framework detected
- console.* used in contexts (localStorage errors, etc.)
- Future: Consider adding structured logging service

**Validation:**
- Form validation: Zod schemas in features (database/schema.ts)
- API response types: Shared-schemas types used as catch-all
- Input sanitization: Delegated to backend

**Authentication:**
- AuthContext manages user state, tokens, session refresh
- apiClient handles token injection into headers
- Socket connection authenticated via access token in socket.io options
- Cloud iframe authentication: Special postMessage protocol for auth code exchange

**Authorization:**
- RequireAuth route wrapper checks isAuthenticated boolean
- Feature-level permissions: Backend responds with 403 Forbidden if user lacks access
- No frontend role-based UI hiding (all protected routes require auth)

**CSRF Protection:**
- apiClient stores csrfToken in cookie (insforge_csrf)
- Backend validates CSRF token on state-changing requests
- Tokens set during login/session refresh from server response

**Analytics:**
- PostHogAnalyticsProvider wraps application
- Integrated via src/lib/analytics/posthog module
- Tracks user events and feature usage

---

*Architecture analysis: 2026-02-01*
