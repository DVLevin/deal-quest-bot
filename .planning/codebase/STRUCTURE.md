# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
insforge/insforge/frontend/
├── public/                 # Static assets (favicon, robots.txt, etc.)
├── src/
│   ├── App.tsx            # Root component with all providers
│   ├── main.tsx           # React DOM entry point
│   ├── index.css          # Global styles
│   ├── rdg.css            # React Data Grid styles
│   ├── vite-env.d.ts      # Vite type definitions
│   ├── assets/            # Images, SVGs, icons
│   │   ├── icons/
│   │   └── [other assets]
│   ├── components/        # Shared UI components (not feature-specific)
│   │   ├── index.ts       # Barrel export
│   │   ├── layout/        # Layout components (AppHeader, AppSidebar, Layout)
│   │   ├── datagrid/      # Data grid cell editors and formatters
│   │   ├── radix/         # Radix UI wrappers (Button, Dialog, Popover, etc.)
│   │   └── [individual components]  # Reusable components (ConfirmDialog, CopyButton, etc.)
│   ├── features/          # Feature-specific modules (domain-driven)
│   │   ├── auth/          # Authentication/user management
│   │   │   ├── pages/     # UsersPage, AuthMethodsPage, ConfigurationPage
│   │   │   ├── components/# Feature-specific UI components
│   │   │   ├── hooks/     # Feature-specific hooks
│   │   │   ├── services/  # Auth API service
│   │   │   ├── contexts/  # Feature-specific context (if any)
│   │   │   └── index.ts   # Barrel export
│   │   ├── database/      # Database management
│   │   │   ├── pages/     # TablesPage, SQLEditorPage, IndexesPage, etc.
│   │   │   ├── components/# DataGrid, RecordForm, TableForm, etc.
│   │   │   ├── hooks/     # useTables, useRecords, useRawSQL, useCSVImport
│   │   │   ├── services/  # tableService, recordService, databaseService
│   │   │   ├── templates/ # Database templates for schema bootstrap
│   │   │   ├── contexts/  # SQLEditorContext (tab management)
│   │   │   ├── schema.ts  # Zod schemas for form validation
│   │   │   ├── helpers.ts # Utility functions (buildDynamicSchema, etc.)
│   │   │   ├── constants.ts# Column types, UI constants
│   │   │   └── index.ts   # Barrel export
│   │   ├── storage/       # File storage management
│   │   │   ├── pages/     # StoragePage
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── functions/     # Serverless functions
│   │   │   ├── pages/     # FunctionsPage, SecretsPage, SchedulesPage
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── realtime/      # Real-time channels & permissions
│   │   │   ├── pages/     # RealtimeChannelsPage, RealtimeMessagesPage
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── logs/          # Logging and audit features
│   │   │   ├── pages/     # LogsPage, MCPLogsPage, AuditsPage
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── ai/            # AI features
│   │   │   ├── pages/     # AIPage
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── login/         # Authentication entry point
│   │   │   ├── pages/     # LoginPage, CloudLoginPage
│   │   │   ├── components/
│   │   │   ├── services/  # loginService, partnershipService
│   │   │   └── index.ts
│   │   ├── onboard/       # Onboarding wizard
│   │   │   ├── pages/
│   │   │   ├── components/# OnboardingController, OnboardingModal, step components
│   │   │   ├── components/mcp/  # MCP setup steps
│   │   │   └── index.ts
│   │   ├── dashboard/     # Main dashboard
│   │   │   ├── pages/     # DashboardPage
│   │   │   ├── components/
│   │   │   ├── prompts/   # Prompt templates
│   │   │   └── index.ts
│   │   ├── visualizer/    # Database visualizer
│   │   │   ├── pages/     # VisualizerPage
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── deployments/   # Deployment management
│   │   │   ├── pages/     # DeploymentsPage
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   └── settings/      # Settings page
│   │       ├── pages/     # SettingsPage
│   │       ├── components/
│   │       └── index.ts
│   └── lib/               # Shared, non-feature-specific utilities
│       ├── api/           # API client
│       │   └── client.ts  # ApiClient singleton class
│       ├── contexts/      # Global state providers
│       │   ├── AuthContext.tsx      # Authentication state
│       │   ├── SocketContext.tsx    # WebSocket connection & real-time updates
│       │   ├── ModalContext.tsx     # Modal dialog state
│       │   └── ThemeContext.tsx     # Dark/light theme
│       ├── hooks/         # Shared custom hooks
│       │   ├── useAuth.ts            # useAuth hook wrapper
│       │   ├── useToast.tsx          # Toast notifications
│       │   ├── useModal.tsx          # Modal dialog trigger
│       │   ├── useConfirm.ts         # Confirmation dialog
│       │   ├── useMetadata.ts        # System metadata query
│       │   ├── usePagination.ts      # Pagination logic
│       │   ├── useMediaQuery.ts      # Responsive design breakpoints
│       │   ├── useInterval.ts        # Interval hook
│       │   └── useTimeout.ts         # Timeout hook
│       ├── routing/       # Navigation & route protection
│       │   ├── AppRoutes.tsx         # Route definitions
│       │   └── RequireAuth.tsx       # Auth guard wrapper
│       ├── services/      # Shared services
│       │   └── metadata.service.ts   # System metadata API
│       ├── analytics/     # Analytics integration
│       │   └── posthog.tsx           # PostHog analytics provider
│       ├── utils/         # Utility functions
│       │   ├── utils.ts              # General utilities (isIframe, convertValueForColumn, etc.)
│       │   ├── constants.ts          # App constants
│       │   ├── menuItems.ts          # Main menu navigation items
│       │   ├── schemaValidations.ts  # Form validation helpers
│       │   └── cloudMessaging.ts     # Parent window messaging for cloud embed
│       └── routing/
│           └── [routing utilities]
├── tsconfig.json          # TypeScript configuration
├── tsconfig.node.json     # TypeScript for Vite config
├── vite.config.ts         # Vite build configuration
├── vitest.config.ts       # Test runner configuration
├── components.json        # UI component documentation (shadcn/ui)
├── package.json           # Dependencies
└── .eslintrc*, .prettierrc*  # Linting & formatting config
```

## Directory Purposes

**`src/App.tsx`:**
- Purpose: Root React component that wraps entire app with providers
- Contains: Nested provider components (QueryClientProvider, AuthProvider, SocketProvider, etc.)
- Responsibilities: Establish provider hierarchy, pass config (QueryClient options) to providers

**`src/main.tsx`:**
- Purpose: Vite entry point that mounts React app to DOM
- Contains: ReactDOM.createRoot() call, BrowserRouter wrapper
- Responsibilities: Initialize React DOM, mount App component to #root element

**`src/components/`:**
- Purpose: Shared UI components used across multiple features
- Contains: Layout components, Radix UI wrappers, reusable dialogs/buttons/inputs
- Key files:
  - `layout/Layout.tsx`: Main page layout wrapper (header, sidebar, content)
  - `layout/AppHeader.tsx`: Top navigation bar with user menu
  - `layout/AppSidebar.tsx`: Feature navigation sidebar
  - `radix/`: Customized Radix UI components (Button, Dialog, Popover, etc.)
  - `datagrid/`: Cell editors and custom renderers for react-data-grid

**`src/features/`:**
- Purpose: Domain-driven modules organizing code by business capability
- Organization: Each feature is self-contained with its own pages, components, hooks, services
- Structure: Features do NOT depend on each other; they only depend on lib/shared-schemas
- Barrel exports: Each feature exports public API via index.ts

**`src/features/{feature}/pages/`:**
- Purpose: Top-level page components for feature routes
- Pattern: One page component per route, handles routing-level state and composition
- Examples: `database/pages/TablesPage.tsx`, `storage/pages/StoragePage.tsx`

**`src/features/{feature}/components/`:**
- Purpose: Feature-specific UI components that are NOT pages
- Pattern: Exported via `index.ts` barrel for use in pages or other features
- Examples: `database/components/RecordFormDialog.tsx`, `database/components/TableSidebar.tsx`

**`src/features/{feature}/hooks/`:**
- Purpose: Feature-specific custom hooks combining React Query with business logic
- Pattern: Hooks return { data, isLoading, error, actions } combining useQuery + useMutation
- Examples: `database/hooks/useTables.ts`, `database/hooks/useRecords.ts`

**`src/features/{feature}/services/`:**
- Purpose: Encapsulate API communication for feature domain
- Pattern: Service class with static/singleton methods wrapping apiClient.request()
- Examples: `database/services/tableService.ts`, `storage/services/storageService.ts`

**`src/lib/api/client.ts`:**
- Purpose: HTTP client singleton managing requests, auth tokens, CSRF, retries
- Contains: ApiClient class with methods: request(), setAccessToken(), setCsrfToken(), etc.
- Responsibilities:
  - Inject Authorization header (Bearer token)
  - Queue 401 refresh requests and retry
  - Parse responses and content-range pagination headers
  - Clear tokens on auth failure

**`src/lib/contexts/`:**
- Purpose: Global state providers for cross-cutting concerns
- AuthContext: User session, login/logout, token management, auth error handling
- SocketContext: WebSocket connection, real-time data update broadcasting
- ModalContext: Global modal dialog state (confirm, prompt, generic)
- ThemeContext: Dark/light theme preference and system detection
- SQLEditorContext: SQL editor tab management and persistence

**`src/lib/hooks/`:**
- Purpose: Shared custom hooks used across features
- useAuth: Access AuthContext state and methods
- useToast: Show toast notification (info, success, error, warning)
- useModal: Trigger modal dialogs (confirm, prompt, generic)
- useConfirm: Simplified confirmation dialog pattern
- useMetadata: Fetch system metadata (project info, features)
- usePagination: Pagination state and helpers

**`src/lib/routing/AppRoutes.tsx`:**
- Purpose: Define all application routes and route hierarchy
- Pattern: Nested Routes (outer: auth-agnostic, inner: protected)
- Structure:
  - Outer: `/dashboard/login`, `/cloud/login` (public)
  - Inner (wrapped in RequireAuth + Layout): All `/dashboard/*` routes
  - Navigation: `/` redirects to `/dashboard`

**`src/lib/utils/`:**
- Purpose: Non-domain-specific utility functions and constants
- constants.ts: App-level constants (timeouts, page sizes, etc.)
- utils.ts: General helpers (type converters, browser detection, etc.)
- menuItems.ts: Navigation structure for AppSidebar and AppHeader
- schemaValidations.ts: Form validation helpers
- cloudMessaging.ts: PostMessage protocol for cloud embed communication

**`src/features/database/schema.ts`:**
- Purpose: Zod schemas for database feature forms and validation
- Contains: tableFormSchema, tableFormColumnSchema, tableFormForeignKeySchema
- Usage: Form validation in TableForm, column editing, record creation

**`src/features/database/helpers.ts`:**
- Purpose: Feature-specific utility functions
- Contains: buildDynamicSchema(), getInitialValues()
- Usage: Dynamic form generation from table schemas

**`src/features/database/templates/`:**
- Purpose: Pre-defined database templates for quick schema bootstrap
- Contains: Template components and template definitions
- Usage: User can select template in TablesPage to auto-create tables

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM mount point
- `src/App.tsx`: Root component with providers
- `src/lib/routing/AppRoutes.tsx`: Route definitions
- `src/components/layout/Layout.tsx`: Main layout wrapper

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases (@ = src/)
- `vite.config.ts`: Vite build config, dev server, plugins
- `vitest.config.ts`: Test runner configuration
- `package.json`: Dependencies (React, TanStack Query, Socket.io, Vite, etc.)

**Core Logic:**
- `src/lib/api/client.ts`: HTTP client with token/CSRF management
- `src/lib/contexts/AuthContext.tsx`: Auth state and session management
- `src/lib/contexts/SocketContext.tsx`: WebSocket connection and real-time updates
- `src/features/login/services/loginService.ts`: Login/logout/token refresh logic

**Database Feature:**
- `src/features/database/pages/TablesPage.tsx`: Main tables list & record editor
- `src/features/database/pages/SQLEditorPage.tsx`: SQL query editor
- `src/features/database/hooks/useTables.ts`: Fetch & mutate tables
- `src/features/database/hooks/useRecords.ts`: Fetch & mutate records
- `src/features/database/services/tableService.ts`: Table CRUD API calls

**Storage Feature:**
- `src/features/storage/pages/StoragePage.tsx`: File browser & uploader
- `src/features/storage/services/storageService.ts`: File API calls

**Real-time Feature:**
- `src/features/realtime/pages/RealtimeChannelsPage.tsx`: Channel management
- `src/features/realtime/services/realtimeService.ts`: Channel API calls

**Authentication Feature:**
- `src/features/auth/pages/UsersPage.tsx`: User management
- `src/features/auth/pages/AuthMethodsPage.tsx`: Auth provider config
- `src/features/auth/services/authService.ts`: User/auth API calls

## Naming Conventions

**Files:**
- Components: PascalCase.tsx (e.g., `TableForm.tsx`, `RecordFormDialog.tsx`)
- Hooks: camelCase.ts starting with "use" (e.g., `useTables.ts`, `useMetadata.ts`)
- Services: camelCase.service.ts (e.g., `table.service.ts`, `record.service.ts`)
- Utilities: camelCase.ts (e.g., `utils.ts`, `constants.ts`)
- Styles: Corresponding component name + .css (e.g., `index.css`, `rdg.css`)
- Types/Schemas: camelCase.ts (e.g., `schema.ts`)

**Directories:**
- Features: kebab-case (e.g., `database`, `auth`, `storage`, `realtime`)
- Feature subdirectories: Explicit descriptors (pages, components, hooks, services, contexts, templates)
- Shared utilities: Descriptive names (lib, utils, components, assets)

**Exports:**
- Barrel exports: All public APIs exported from `index.ts` in feature/component directories
- Example: `src/features/database/index.ts` exports components, hooks, services
- Path aliases: `@/features/*`, `@/components`, `@/lib/*` (configured in tsconfig.json)

## Where to Add New Code

**New Feature:**
1. Create `src/features/{feature-name}/` directory
2. Add subdirectories: `pages/`, `components/`, `hooks/`, `services/`, `contexts/` (if needed)
3. Create feature's `index.ts` barrel with public exports
4. Add route to `src/lib/routing/AppRoutes.tsx`
5. Add navigation item to `src/lib/utils/menuItems.ts`
6. Pages: `src/features/{feature}/pages/{Feature}Page.tsx`
7. Components: `src/features/{feature}/components/{Component}.tsx`
8. Hooks: `src/features/{feature}/hooks/use{Hook}.ts`
9. Services: `src/features/{feature}/services/{entity}.service.ts`

**New Shared Component:**
- Implementation: `src/components/{Component}.tsx`
- Export: Add to `src/components/index.ts` barrel
- If component has subcomponents: Create `src/components/{ComponentDir}/index.tsx` + subfiles

**New Utility Function:**
- Shared helpers: `src/lib/utils/` or create new file
- Feature-specific: `src/features/{feature}/helpers.ts` or `src/features/{feature}/utils.ts`

**New Hook:**
- Feature-specific: `src/features/{feature}/hooks/use{Hook}.ts`
- Shared (cross-feature): `src/lib/hooks/use{Hook}.ts`
- Export from feature `index.ts` or lib barrel

**New Service:**
- Feature-specific: `src/features/{feature}/services/{entity}.service.ts`
- Follow pattern: Class with static methods wrapping `apiClient.request()`
- Export singleton instance: `export const {entity}Service = new {Entity}Service();`

**New Page:**
- Location: `src/features/{feature}/pages/{Feature}Page.tsx`
- Add route: Update `src/lib/routing/AppRoutes.tsx` with new Route element
- Import: Use lazy loading if appropriate (React.lazy + Suspense)

## Special Directories

**`src/assets/`:**
- Purpose: Static images, SVGs, icons
- Generated: No (manually added)
- Committed: Yes

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (run `npm install`)
- Committed: No (listed in .gitignore)

**`dist/`:**
- Purpose: Production build output from Vite
- Generated: Yes (run `npm run build`)
- Committed: No

**`public/`:**
- Purpose: Static files copied to build root (favicon, robots.txt, manifest.json)
- Generated: No (manually added)
- Committed: Yes

---

*Structure analysis: 2026-02-01*
