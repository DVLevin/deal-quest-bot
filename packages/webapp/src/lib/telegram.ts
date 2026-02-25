import {
  init,
  backButton,
  mainButton,
  miniApp,
  themeParams,
  viewport,
  swipeBehavior,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react';

/**
 * Initialize the Telegram Mini App SDK.
 * Must be called before rendering the React tree.
 *
 * Mounts all necessary SDK components and binds CSS variables
 * for theme and viewport safe areas.
 */
export function initTelegramSDK(): void {
  try {
    // 1. Initialize the SDK (MUST be first)
    init();

    // 2. Mount each component we plan to use
    if (backButton.mount.isAvailable()) backButton.mount();
    if (mainButton.mount.isAvailable()) mainButton.mount();
    if (themeParams.mount.isAvailable()) themeParams.mount();
    if (miniApp.mount.isAvailable()) miniApp.mount();

    // 3. Viewport requires async binding
    if (viewport.mount.isAvailable()) {
      viewport.mount().then(() => {
        if (viewport.bindCssVars.isAvailable()) viewport.bindCssVars();
      }).catch(console.warn);
    }

    // 4. Bind theme CSS vars for Telegram color adaptation
    if (themeParams.bindCssVars.isAvailable()) themeParams.bindCssVars();

    // 5. Configure behaviors
    if (swipeBehavior.mount.isAvailable()) {
      swipeBehavior.mount();
      if (swipeBehavior.disableVertical.isAvailable()) swipeBehavior.disableVertical();
    }

    // 6. Signal that the app is ready
    if (miniApp.ready.isAvailable()) miniApp.ready();
  } catch (err) {
    console.warn('[Telegram SDK] Init failed, running in degraded mode:', err);
  }
}

/**
 * Retrieve Telegram launch parameters.
 * In SDK v3, the useLaunchParams() hook was removed.
 * Use this wrapper instead.
 */
export function getLaunchParams() {
  return retrieveLaunchParams();
}
