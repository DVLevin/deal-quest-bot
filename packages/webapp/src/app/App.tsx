import { AuthProvider } from '@/app/providers/AuthProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AppRouter } from '@/app/Router';

/**
 * Root application component.
 *
 * Provider order:
 * 1. AuthProvider -- authenticates via Telegram initData, gates rendering
 * 2. QueryProvider -- TanStack Query for data fetching (after auth)
 * 3. AppRouter -- BrowserRouter with lazy-loaded pages and BackButton
 */
export default function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <AppRouter />
      </QueryProvider>
    </AuthProvider>
  );
}
