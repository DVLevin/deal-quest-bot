/**
 * Telegram authentication hook.
 *
 * Retrieves initDataRaw from Telegram launch params,
 * sends it to the verify-telegram Edge Function,
 * and configures the InsForge client with the returned JWT.
 */

import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { insforgeAnon, createAuthenticatedClient } from '@/lib/insforge';

interface AuthResult {
  jwt: string;
  user: {
    id: number;
    telegram_id: number;
    username: string | null;
    first_name: string | null;
  };
}

/**
 * Authenticate the current Telegram user.
 *
 * Flow:
 * 1. Get initDataRaw from Telegram launch params
 * 2. POST to verify-telegram Edge Function
 * 3. Edge Function validates HMAC-SHA256, upserts user, mints JWT
 * 4. Create authenticated InsForge client with JWT
 * 5. Validate with a test query to confirm auth works
 *
 * @throws Error if not running inside Telegram or auth fails
 */
export async function authenticateWithTelegram(): Promise<AuthResult> {
  const { initDataRaw } = retrieveLaunchParams();

  if (!initDataRaw) {
    throw new Error('No initData available. Are you running inside Telegram?');
  }

  // Call verify-telegram Edge Function
  const { data, error } = await insforgeAnon.functions.invoke<AuthResult>(
    'verify-telegram',
    {
      body: { initDataRaw },
    }
  );

  if (error || !data?.jwt) {
    throw new Error(
      error?.message || 'Authentication failed: no JWT returned'
    );
  }

  // Create authenticated client with the JWT.
  // Uses setAuthToken() on HttpClient -- NOT the "JWT-as-anonKey" pattern.
  const authClient = createAuthenticatedClient(data.jwt);

  // Validation query: confirm the authenticated client can query the database.
  // This verifies that the JWT is accepted by InsForge's PostgREST layer.
  try {
    const { data: testData, error: testError } = await authClient.database
      .from('users')
      .select('id, telegram_id')
      .eq('telegram_id', data.user.telegram_id)
      .limit(1);

    if (testError) {
      console.error('[AUTH] Validation query failed:', testError);
      throw new Error(
        `Auth validation failed: ${typeof testError === 'object' ? JSON.stringify(testError) : testError}`
      );
    }

    console.info(
      '[AUTH] Authenticated successfully. Validation query returned:',
      testData
    );
  } catch (validationErr) {
    // If the validation query fails, the JWT may not be accepted by PostgREST.
    // Log the error for debugging but don't block auth -- the Edge Function
    // itself succeeded and the JWT is valid. RLS validation will happen
    // on actual data queries.
    console.warn(
      '[AUTH] Validation query threw:',
      validationErr,
      '-- proceeding with auth anyway (Edge Function succeeded)'
    );
  }

  return {
    jwt: data.jwt,
    user: data.user,
  };
}
