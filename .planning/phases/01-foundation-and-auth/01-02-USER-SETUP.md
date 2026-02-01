# Plan 01-02: User Setup Required

This plan created authentication infrastructure that requires manual deployment steps.

## 1. InsForge Environment Secrets

Set the following environment secrets in InsForge (Dashboard -> Settings -> Environment Variables, or via MCP tools):

### TELEGRAM_BOT_TOKEN

- **Source:** Already exists in `deal-quest-bot/bot/.env` as `TELEGRAM_BOT_TOKEN`
- **Purpose:** Used by the Edge Function to validate initData HMAC-SHA256 signatures
- **Set via:** InsForge Dashboard -> Settings -> Edge Function Secrets

### JWT_SECRET

- **Source:** Generate a random 32+ character string, or use the JWT secret from InsForge Dashboard -> Settings -> API
- **Purpose:** Used to sign and verify JWTs for authenticated API access
- **Important:** If InsForge has its own JWT secret for PostgREST, use THAT secret so the minted JWTs are accepted by InsForge's PostgREST layer for RLS enforcement
- **Set via:** InsForge Dashboard -> Settings -> Edge Function Secrets

## 2. Deploy verify-telegram Edge Function

The Edge Function code is at `deal-quest-bot/functions/verify-telegram/index.ts`.

Deploy using one of:

**Option A: MCP tool (preferred)**
```
mcp__insforge__create-function({
  name: "verify-telegram",
  code: <contents of functions/verify-telegram/index.ts>
})
```

**Option B: InsForge Dashboard**
1. Go to InsForge Dashboard -> Edge Functions
2. Create new function named `verify-telegram`
3. Paste the contents of `functions/verify-telegram/index.ts`
4. Deploy

## 3. Execute RLS Migration

The RLS SQL is at `deal-quest-bot/migrations/001_enable_rls_and_policies.sql`.

Execute using one of:

**Option A: MCP tool**
```
mcp__insforge__run-raw-sql({ sql: <batch 1 SQL> })
mcp__insforge__run-raw-sql({ sql: <batch 2 SQL> })
mcp__insforge__run-raw-sql({ sql: <batch 3 SQL> })
```

**Option B: InsForge Dashboard SQL Editor**
1. Go to InsForge Dashboard -> SQL Editor
2. Execute each batch separately (Batch 1, then 2, then 3)
3. Run verification queries at the bottom of the file

**IMPORTANT:** Execute Batch 2 (anon policies) BEFORE Batch 3 (authenticated policies) to keep the Python bot working throughout.

## 4. Webapp Environment Variables

Ensure these are set in `deal-quest-bot/packages/webapp/.env.local` (or `.env`):

```env
VITE_INSFORGE_URL=https://wz7ymxxu.eu-central.insforge.app
VITE_INSFORGE_ANON_KEY=<your InsForge anon key>
```

Get the anon key via:
```
mcp__insforge__get-anon-key()
```
Or from InsForge Dashboard -> Settings -> API -> Anon Key.

## 5. Verification

After completing all steps above:

### Verify Edge Function
```bash
# Should return CORS headers on OPTIONS
curl -X OPTIONS https://wz7ymxxu.eu-central.insforge.app/api/functions/verify-telegram -i

# Should return 400 (missing initDataRaw)
curl -X POST https://wz7ymxxu.eu-central.insforge.app/api/functions/verify-telegram \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Verify RLS
```sql
-- Check RLS enabled (all should show true)
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Count policies (should be 31: 9 anon + 22 authenticated)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';

-- Verify bot still works (anon role)
SET ROLE anon;
SELECT COUNT(*) FROM users;
RESET ROLE;
```

### Verify Anon Key
```bash
# Should return data
curl https://wz7ymxxu.eu-central.insforge.app/api/database/records/users?limit=1 \
  -H "Authorization: Bearer <anon-key>"
```
