-- Migration: Add user_instructions column to draft_requests
-- Purpose: Allow users to provide custom instructions when regenerating drafts
-- Run manually via InsForge dashboard SQL editor

ALTER TABLE draft_requests ADD COLUMN user_instructions TEXT DEFAULT NULL;
