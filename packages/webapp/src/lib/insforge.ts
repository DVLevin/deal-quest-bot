/**
 * InsForge client management.
 *
 * Provides an anon client for initial Edge Function calls (auth)
 * and an authenticated client that uses the JWT from Telegram auth.
 *
 * JWT is stored in memory only (not localStorage). Re-minted on every TMA open.
 */

import { createClient, type InsForgeClient } from '@insforge/sdk';

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL;
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!INSFORGE_URL) {
  throw new Error('VITE_INSFORGE_URL environment variable is not set');
}

if (!INSFORGE_ANON_KEY) {
  throw new Error('VITE_INSFORGE_ANON_KEY environment variable is not set');
}

/**
 * Anon client for unauthenticated requests.
 * Used for the initial auth Edge Function call.
 */
export const insforgeAnon = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
  persistSession: false,
  autoRefreshToken: false,
});

/**
 * Authenticated client singleton.
 * Created once after JWT is obtained from verify-telegram Edge Function.
 * Uses setAuthToken() on the HttpClient to send JWT as Bearer token.
 */
let insforgeAuth: InsForgeClient | null = null;

/**
 * Create the "authenticated" InsForge client after verifying the user.
 *
 * IMPORTANT: We intentionally do NOT call setAuthToken() here.
 * Our Edge Function mints custom JWTs (HS256 with our own secret),
 * but InsForge PostgREST uses a different JWT secret and rejects them
 * with 401. All data queries would fail.
 *
 * Instead, queries go through as the `anon` role using the anon key.
 * We have anon full-access RLS policies that allow all operations.
 * Per-user data isolation is enforced at the query level — every hook
 * filters by telegram_id from the Zustand auth store.
 *
 * The Edge Function still validates the Telegram initData and returns
 * the user's identity. We just don't use its JWT for PostgREST.
 *
 * @param _jwt - JWT from Edge Function (stored in auth store, not used for queries)
 * @returns InsForge client using anon key
 */
export function createAuthenticatedClient(_jwt: string): InsForgeClient {
  insforgeAuth = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    persistSession: false,
    autoRefreshToken: false,
  });

  return insforgeAuth;
}

/**
 * Get the authenticated InsForge client.
 * Throws if called before authentication is complete.
 */
export function getInsforge(): InsForgeClient {
  if (!insforgeAuth) {
    throw new Error(
      'InsForge client not authenticated. Call createAuthenticatedClient first.'
    );
  }
  return insforgeAuth;
}
