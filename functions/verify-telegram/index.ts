// TODO: The Python bot currently uses the anon key which has full-access RLS policies.
// This is a security compromise -- anon key in the JS bundle also gets full access.
// Migration path: Bot should use a service role key (bypasses RLS) in a future phase.
// Once migrated, remove all "anon_full_*" policies to lock down client-side access.

// InsForge Edge Function: verify-telegram
// Validates Telegram initData HMAC-SHA256 signatures and mints JWTs.
// Runtime: Deno. createClient is injected by InsForge runtime.
// Secrets: TELEGRAM_BOT_TOKEN, JWT_SECRET via Deno.env.get()

const { SignJWT } = require("jose");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

module.exports = async function (request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { initDataRaw } = await request.json();

    if (!initDataRaw) {
      return jsonResponse({ error: "Missing initDataRaw" }, 400);
    }

    // 1. Parse initData into key-value pairs
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get("hash");
    params.delete("hash");

    if (!hash) {
      return jsonResponse({ error: "Missing hash in initData" }, 400);
    }

    // 2. Sort alphabetically and create data-check-string
    const entries = [...params.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    // 3. HMAC-SHA256 validation (Telegram's exact algorithm)
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      console.error("[verify-telegram] TELEGRAM_BOT_TOKEN not set");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const encoder = new TextEncoder();

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretHash = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(botToken)
    );

    // computed_hash = HMAC-SHA256(secret_key, data_check_string)
    const validationKey = await crypto.subtle.importKey(
      "raw",
      secretHash,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const computedHash = await crypto.subtle.sign(
      "HMAC",
      validationKey,
      encoder.encode(dataCheckString)
    );

    // Compare hex
    const computedHex = [...new Uint8Array(computedHash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHex !== hash) {
      return jsonResponse({ error: "Invalid initData signature" }, 403);
    }

    // 4. Check auth_date freshness (reject > 1 hour)
    const authDate = parseInt(params.get("auth_date") || "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) {
      return jsonResponse({ error: "initData expired" }, 403);
    }

    // 5. Extract user info
    const userParam = params.get("user");
    if (!userParam) {
      return jsonResponse({ error: "Missing user in initData" }, 400);
    }

    const userData = JSON.parse(userParam);
    const telegramId = userData.id;

    if (!telegramId) {
      return jsonResponse({ error: "Missing user id in initData" }, 400);
    }

    // 6. Upsert user in InsForge
    // @ts-expect-error createClient is injected by InsForge Edge Function runtime
    const client = createClient({
      baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") || "http://insforge:7130",
      anonKey: Deno.env.get("ANON_KEY"),
    });

    const { data: existingUsers } = await client.database
      .from("users")
      .select("id, telegram_id")
      .eq("telegram_id", telegramId)
      .limit(1);

    let userId: number;

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      // Update last_active_at and profile info
      await client.database
        .from("users")
        .update({
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", telegramId);
    } else {
      const { data: newUser } = await client.database
        .from("users")
        .insert({
          telegram_id: telegramId,
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_active_at: new Date().toISOString(),
        })
        .select("id");

      if (!newUser || newUser.length === 0) {
        return jsonResponse({ error: "Failed to create user" }, 500);
      }
      userId = newUser[0].id;
    }

    // 7. Mint JWT using jose (HS256, 1 hour expiry)
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      console.error("[verify-telegram] JWT_SECRET not set");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const secret = new TextEncoder().encode(jwtSecret);

    const jwt = await new SignJWT({
      sub: String(userId),
      telegram_id: telegramId,
      role: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setIssuer("deal-quest-tma")
      .sign(secret);

    // 8. Return response
    return jsonResponse(
      {
        jwt,
        user: {
          id: userId,
          telegram_id: telegramId,
          username: userData.username || null,
          first_name: userData.first_name || null,
        },
      },
      200
    );
  } catch (err) {
    console.error("[verify-telegram] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
};
