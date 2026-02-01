/**
 * TanStack Query provider with sensible defaults for TMA usage.
 *
 * - 5 minute stale time (data refreshes infrequently in TMA context)
 * - Single retry on failure
 * - No refetch on window focus (TMA lifecycle managed separately)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // TMA lifecycle handled separately via activated/deactivated
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
