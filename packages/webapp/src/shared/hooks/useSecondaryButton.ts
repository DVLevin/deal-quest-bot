/**
 * Configure Telegram SecondaryButton declaratively.
 *
 * SecondaryButton is available in Bot API 7.10+.
 * Sets text, click handler, position, and visibility. Cleans up on unmount.
 * All SDK calls guarded with isAvailable() checks.
 */

import { useEffect } from 'react';
import { secondaryButton } from '@telegram-apps/sdk-react';

export interface UseSecondaryButtonOptions {
  /** Button label text */
  text: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is visible (default: true) */
  isVisible?: boolean;
  /** Whether the button is enabled (default: true) */
  isEnabled?: boolean;
  /** Button position relative to MainButton (default: 'left') */
  position?: 'left' | 'right' | 'top' | 'bottom';
}

export function useSecondaryButton({
  text,
  onClick: handler,
  isVisible = true,
  isEnabled = true,
  position = 'left',
}: UseSecondaryButtonOptions): void {
  // Mount the secondary button if supported
  useEffect(() => {
    if (!secondaryButton.mount.isAvailable()) return;

    secondaryButton.mount();
    return () => {
      secondaryButton.unmount();
    };
  }, []);

  // Sync params
  useEffect(() => {
    if (!secondaryButton.setParams.isAvailable()) return;

    secondaryButton.setParams({
      text,
      isVisible,
      isEnabled,
      position,
    });
  }, [text, isVisible, isEnabled, position]);

  // Bind click handler
  useEffect(() => {
    if (!secondaryButton.onClick.isAvailable()) return;

    const off = secondaryButton.onClick(handler);
    return () => {
      off();
    };
  }, [handler]);

  // Hide on unmount
  useEffect(() => {
    return () => {
      if (secondaryButton.setParams.isAvailable()) {
        secondaryButton.setParams({ isVisible: false });
      }
    };
  }, []);
}
