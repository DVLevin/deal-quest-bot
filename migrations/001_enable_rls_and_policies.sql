-- Migration 001: Enable RLS on all tables with authenticated and anon policies
-- Execute via InsForge Dashboard SQL editor or mcp__insforge__run-raw-sql
--
-- IMPORTANT: Execute batches in order. Batch 2 (anon policies) MUST be applied
-- before authenticated policies to ensure the Python bot keeps working.

-- ============================================================================
-- BATCH 1: Enable RLS on all tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE casebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BATCH 2: Anon full-access policies (bot compatibility)
-- ============================================================================
-- Allow anon role full access for the bot (bot uses anon key server-side).
-- TODO: Migrate bot to service role key in a future phase, then remove these
-- anon full-access policies. This is a known security compromise: anon key
-- has full DB access until bot migration.

CREATE POLICY "anon_full_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_attempts" ON attempts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_track_progress" ON track_progress FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_support_sessions" ON support_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_scenarios_seen" ON scenarios_seen FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_lead_registry" ON lead_registry FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_lead_activity" ON lead_activity_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_casebook" ON casebook FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_user_memory" ON user_memory FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- BATCH 3: Authenticated-role policies (scoped to telegram_id from JWT)
-- ============================================================================
-- JWT claims are accessed via: current_setting('request.jwt.claims', true)::json->>'telegram_id'
-- If InsForge uses a different mechanism, adjust the claim extraction pattern.

-- Users: read/update own row
CREATE POLICY "users_select_own" ON users FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "users_update_own" ON users FOR UPDATE TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Attempts: read own, insert own
CREATE POLICY "attempts_select_own" ON attempts FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "attempts_insert_own" ON attempts FOR INSERT TO authenticated
  WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Track progress: read/write own
CREATE POLICY "track_progress_select_own" ON track_progress FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "track_progress_insert_own" ON track_progress FOR INSERT TO authenticated
  WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "track_progress_update_own" ON track_progress FOR UPDATE TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Support sessions: read own, insert own
CREATE POLICY "support_sessions_select_own" ON support_sessions FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "support_sessions_insert_own" ON support_sessions FOR INSERT TO authenticated
  WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Scenarios seen: read own, insert own
CREATE POLICY "scenarios_seen_select_own" ON scenarios_seen FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "scenarios_seen_insert_own" ON scenarios_seen FOR INSERT TO authenticated
  WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Lead registry: full CRUD own
CREATE POLICY "lead_registry_select_own" ON lead_registry FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "lead_registry_insert_own" ON lead_registry FOR INSERT TO authenticated
  WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "lead_registry_update_own" ON lead_registry FOR UPDATE TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Lead activity log: read own, insert own
CREATE POLICY "lead_activity_select_own" ON lead_activity_log FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "lead_activity_insert_own" ON lead_activity_log FOR INSERT TO authenticated
  WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Casebook: read all (shared resource), insert by any authenticated user
CREATE POLICY "casebook_select_all" ON casebook FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "casebook_insert_auth" ON casebook FOR INSERT TO authenticated
  WITH CHECK (true);

-- User memory: read/write own
CREATE POLICY "user_memory_select_own" ON user_memory FOR SELECT TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "user_memory_insert_own" ON user_memory FOR INSERT TO authenticated
  WITH CHECK (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);
CREATE POLICY "user_memory_update_own" ON user_memory FOR UPDATE TO authenticated
  USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying the migration to verify:
--
-- 1. Check RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--
-- 2. Check policies exist:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
--
-- 3. Verify anon access (bot compatibility):
-- SET ROLE anon;
-- SELECT COUNT(*) FROM users;
-- RESET ROLE;
--
-- 4. Count anon_full policies (should be 9):
-- SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE 'anon_full_%';

-- ============================================================================
-- ROLLBACK (if RLS breaks the bot)
-- ============================================================================
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE attempts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE track_progress DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE support_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE scenarios_seen DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lead_registry DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lead_activity_log DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE casebook DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_memory DISABLE ROW LEVEL SECURITY;
