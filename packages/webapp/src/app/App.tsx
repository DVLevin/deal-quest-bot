import { ErrorBoundary, ToastContainer } from '@/shared/ui';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AppRouter } from '@/app/Router';

/**
 * Root application component.
 *
 * Provider order:
 * 1. ErrorBoundary -- catches unhandled render errors (outermost)
 * 2. AuthProvider -- authenticates via Telegram initData, gates rendering
 * 3. QueryProvider -- TanStack Query for data fetching (after auth)
 * 4. ToastContainer + AppRouter -- notifications persist across routes
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryProvider>
          <ToastContainer />
          <AppRouter />
        </QueryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
