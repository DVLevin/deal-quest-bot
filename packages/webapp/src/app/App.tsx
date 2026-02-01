import { getRankTitle } from '@deal-quest/shared';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';

/**
 * Root application component.
 *
 * Provider order:
 * 1. AuthProvider -- authenticates via Telegram initData, gates rendering
 * 2. QueryProvider -- TanStack Query for data fetching (after auth)
 * 3. Router -- added in Plan 04
 */
export default function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
          <h1>Deal Quest TMA</h1>
          <p>Authenticated successfully.</p>
          <p>Starting rank: {getRankTitle(1)}</p>
        </div>
      </QueryProvider>
    </AuthProvider>
  );
}
