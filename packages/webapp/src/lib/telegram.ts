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
  // 1. Initialize the SDK (MUST be first)
  init();

  // 2. Mount each component we plan to use
  backButton.mount();
  mainButton.mount();
  themeParams.mount();
  miniApp.mount();

  // 3. Viewport requires async binding
  viewport.mount().then(() => {
    viewport.bindCssVars();
  });

  // 4. Bind theme CSS vars for Telegram color adaptation
  themeParams.bindCssVars();

  // 5. Configure behaviors
  if (swipeBehavior.mount.isAvailable()) {
    swipeBehavior.mount();
    swipeBehavior.disableVertical();
  }

  // 6. Signal that the app is ready
  miniApp.ready();
}

/**
 * Retrieve Telegram launch parameters.
 * In SDK v3, the useLaunchParams() hook was removed.
 * Use this wrapper instead.
 */
export function getLaunchParams() {
  return retrieveLaunchParams();
}
