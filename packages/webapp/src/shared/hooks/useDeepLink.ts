/**
 * Deep link routing hook for TMA startParam.
 *
 * When the TMA is opened via a direct link (t.me/bot/app?startapp=learn),
 * Telegram passes the startapp value as startParam in launch params.
 * This hook reads it and navigates to the corresponding route.
 *
 * For inline web_app buttons (Plan 01), routing happens natively via
 * BrowserRouter because WebAppInfo.url contains the full path. This
 * hook is a fallback for direct link launches only.
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

const START_PARAM_MAP: Record<string, string> = {
  stats: '/',
  dashboard: '/',
  learn: '/learn',
  train: '/train',
  support: '/support',
  leads: '/leads',
  profile: '/profile',
};

export function useDeepLink() {
  const navigate = useNavigate();
  const location = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    // Only process once per app lifecycle
    if (handled.current) return;
    handled.current = true;

    // If already navigated to a non-root path (via WebAppInfo URL), skip
    if (location.pathname !== '/') return;

    try {
      const lp = retrieveLaunchParams();
      const startParam = lp.tgWebAppStartParam as string | undefined;
      if (startParam) {
        const route = START_PARAM_MAP[startParam];
        if (route && route !== '/') {
          navigate(route, { replace: true });
        }
      }
    } catch {
      // Not in Telegram context or SDK unavailable -- silently ignore
    }
  }, []);
}
