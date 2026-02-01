/**
 * Mock Telegram WebApp environment for browser development.
 * This script runs before the React app and provides a fake
 * window.Telegram.WebApp object so the SDK can initialize
 * outside of the actual Telegram client.
 *
 * Only active when Telegram's native object is not present.
 */
if (!(window as any).Telegram) {
  const searchParams = new URLSearchParams(window.location.search);

  // Build a mock initData string for development
  const mockUser = JSON.stringify({
    id: 123456789,
    first_name: 'Dev',
    last_name: 'User',
    username: 'devuser',
    language_code: 'en',
    is_premium: false,
  });

  const initData = searchParams.get('initData') || [
    `user=${encodeURIComponent(mockUser)}`,
    `hash=mock_hash_for_development`,
    `auth_date=${Math.floor(Date.now() / 1000)}`,
    `query_id=mock_query_id`,
  ].join('&');

  // Determine color scheme from system preferences
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const themeParams = {
    bg_color: isDark ? '#212121' : '#ffffff',
    text_color: isDark ? '#ffffff' : '#000000',
    hint_color: isDark ? '#aaaaaa' : '#999999',
    link_color: isDark ? '#8774e1' : '#3390ec',
    button_color: isDark ? '#8774e1' : '#3390ec',
    button_text_color: '#ffffff',
    secondary_bg_color: isDark ? '#181818' : '#f0f0f0',
    header_bg_color: isDark ? '#212121' : '#ffffff',
    accent_text_color: isDark ? '#8774e1' : '#3390ec',
    section_bg_color: isDark ? '#212121' : '#ffffff',
    section_header_text_color: isDark ? '#aaaaaa' : '#999999',
    subtitle_text_color: isDark ? '#aaaaaa' : '#999999',
    destructive_text_color: '#e53935',
  };

  (window as any).__telegram__initParams = {
    tgWebAppData: initData,
    tgWebAppVersion: '8.0',
    tgWebAppPlatform: 'tdesktop',
    tgWebAppThemeParams: JSON.stringify(themeParams),
  };
}
