/**
 * Zustand auth store.
 *
 * Holds JWT, telegramId, and userId in memory only.
 * No localStorage persistence -- JWT is re-minted on every TMA open
 * via the verify-telegram Edge Function.
 */

import { create } from 'zustand';

interface AuthState {
  /** JWT from verify-telegram Edge Function */
  jwt: string | null;
  /** Telegram user ID from initData */
  telegramId: number | null;
  /** InsForge database user ID */
  userId: number | null;
  /** Telegram profile photo URL */
  photoUrl: string | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isLoading: boolean;
  /** Error message if authentication failed */
  error: string | null;

  /** Set auth state after successful authentication */
  setAuth: (jwt: string, telegramId: number, userId: number, photoUrl?: string | null) => void;
  /** Update loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Clear all auth state */
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  telegramId: null,
  userId: null,
  photoUrl: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading -- auth runs on mount
  error: null,

  setAuth: (jwt, telegramId, userId, photoUrl) =>
    set({
      jwt,
      telegramId,
      userId,
      photoUrl: photoUrl ?? null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  clearAuth: () =>
    set({
      jwt: null,
      telegramId: null,
      userId: null,
      photoUrl: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
