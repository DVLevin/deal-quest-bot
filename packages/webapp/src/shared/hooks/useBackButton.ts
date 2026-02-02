/**
 * Sync Telegram BackButton with react-router navigation.
 *
 * Shows the BackButton on non-root routes and navigates back on click.
 * All SDK calls guarded with isAvailable() checks.
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { backButton } from '@telegram-apps/sdk-react';

export function useBackButton(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = location.pathname === '/';

  useEffect(() => {
    // Show/hide based on whether we're on the root route
    if (isRoot) {
      if (backButton.hide.isAvailable()) {
        backButton.hide();
      }
    } else {
      if (backButton.show.isAvailable()) {
        backButton.show();
      }
    }
  }, [isRoot]);

  useEffect(() => {
    if (isRoot) return;

    if (!backButton.onClick.isAvailable()) return;

    const off = backButton.onClick(() => {
      navigate(-1);
    });

    return () => {
      off();
    };
  }, [isRoot, navigate]);
}
