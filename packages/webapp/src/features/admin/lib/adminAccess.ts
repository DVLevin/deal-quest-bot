/**
 * Admin access control via VITE_ADMIN_USERNAMES environment variable.
 *
 * Parses a comma-separated list of Telegram usernames (with or without @)
 * and provides a check function. Matches the bot's admin username pattern.
 *
 * Security note: This is client-side access control only (v1 limitation).
 * Server-side RLS policies should enforce admin access in production.
 */

export const ADMIN_USERNAMES: string[] = (
  import.meta.env.VITE_ADMIN_USERNAMES ?? ''
)
  .split(',')
  .map((u: string) => u.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean);

/**
 * Check if a Telegram username has admin access.
 *
 * @param username - Telegram username (with or without @)
 * @returns true if the username is in the admin list
 */
export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return ADMIN_USERNAMES.includes(username.toLowerCase().replace(/^@/, ''));
}
