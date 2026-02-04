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
        setAuth(jwt, user.telegram_id, user.id, user.photo_url);
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
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2 px-4">
        <div className="text-red-500 text-sm font-medium">
          Authentication Error
        </div>
        <div className="text-text-hint text-xs text-center max-w-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
