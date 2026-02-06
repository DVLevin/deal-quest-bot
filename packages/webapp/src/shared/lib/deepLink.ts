import { openTelegramLink } from '@telegram-apps/sdk-react';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

/**
 * Open a deep link to the bot chat with a /start payload.
 * Uses native Telegram SDK when available, falls back to window.open.
 *
 * @param payload - The deep link payload (appended after ?start=)
 *   Must be 1-64 chars, base64url alphabet [A-Za-z0-9_-]
 */
export function openBotDeepLink(payload: string): void {
  const url = `https://t.me/${BOT_USERNAME}?start=${payload}`;
  if (openTelegramLink.isAvailable()) {
    openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}
