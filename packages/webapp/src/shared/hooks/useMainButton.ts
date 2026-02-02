/**
 * Configure Telegram MainButton declaratively.
 *
 * Sets text, click handler, and visibility. Cleans up on unmount.
 * All SDK calls guarded with isAvailable() checks.
 */

import { useEffect } from 'react';
import { mainButton } from '@telegram-apps/sdk-react';

export interface UseMainButtonOptions {
  /** Button label text */
  text: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is visible (default: true) */
  isVisible?: boolean;
  /** Whether the button is enabled (default: true) */
  isEnabled?: boolean;
  /** Show loading spinner on the button */
  isLoaderVisible?: boolean;
}

export function useMainButton({
  text,
  onClick: handler,
  isVisible = true,
  isEnabled = true,
  isLoaderVisible = false,
}: UseMainButtonOptions): void {
  // Sync params
  useEffect(() => {
    if (!mainButton.setParams.isAvailable()) return;

    mainButton.setParams({
      text,
      isVisible,
      isEnabled,
      isLoaderVisible,
    });
  }, [text, isVisible, isEnabled, isLoaderVisible]);

  // Bind click handler
  useEffect(() => {
    if (!mainButton.onClick.isAvailable()) return;

    const off = mainButton.onClick(handler);
    return () => {
      off();
    };
  }, [handler]);

  // Hide on unmount
  useEffect(() => {
    return () => {
      if (mainButton.setParams.isAvailable()) {
        mainButton.setParams({ isVisible: false });
      }
    };
  }, []);
}
