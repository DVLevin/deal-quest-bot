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
 * Create an authenticated InsForge client with the user's JWT.
 *
 * The InsForge SDK's HttpClient has setAuthToken() which sets the
 * Authorization: Bearer header on all subsequent requests. This is
 * the proper way to authenticate -- NOT the "JWT-as-anonKey" pattern.
 *
 * @param jwt - JWT from verify-telegram Edge Function
 * @returns Authenticated InsForge client
 */
export function createAuthenticatedClient(jwt: string): InsForgeClient {
  insforgeAuth = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    persistSession: false,
    autoRefreshToken: false,
  });

  // Set the JWT as the auth token on the HTTP client.
  // This causes all requests to include Authorization: Bearer {jwt}
  insforgeAuth.getHttpClient().setAuthToken(jwt);

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
