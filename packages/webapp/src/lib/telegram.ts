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

  // 2. Mount synchronous components
  backButton.mount();
  mainButton.mount();
  miniApp.mount();

  // 3. Mount async components and bind CSS vars after mount completes
  themeParams.mount().then(() => {
    themeParams.bindCssVars();
  });

  viewport.mount().then(() => {
    viewport.bindCssVars();
  });

  // 4. Configure behaviors
  if (swipeBehavior.mount.isAvailable()) {
    swipeBehavior.mount();
    swipeBehavior.disableVertical();
  }

  // 5. Signal that the app is ready
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
