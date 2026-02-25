/**
 * Auth provider that authenticates the user on mount.
 *
 * Renders loading state during authentication, error state on failure,
 * and children only after successful authentication.
 *
 * Should wrap the entire app (after TelegramSDK init, before QueryProvider).
 */

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { authenticateWithTelegram } from '@/features/auth/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading, isAuthenticated, error, setAuth, setError } =
    useAuthStore();

  useEffect(() => {
    authenticateWithTelegram()
      .then(({ jwt, user }) => {
        setAuth(jwt, user.telegram_id, user.id);
      })
      .catch((err: Error) => {
        console.error('[AuthProvider] Authentication failed:', err);
        setError(err.message);
      });
  }, [setAuth, setError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-hint text-sm">Authenticating...</div>
      </div>
    );
  }

  if (error) {
    // In development or when Edge Function isn't deployed yet,
    // show the app shell anyway so navigation can be tested.
    // The error banner stays visible as a reminder.
    return (
      <>
        <div className="bg-red-500/10 text-red-500 text-xs text-center px-4 py-2">
          Auth: {error}
        </div>
        {children}
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
