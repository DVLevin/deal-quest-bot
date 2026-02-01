import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { NavBar } from '@/shared/ui/NavBar';

export interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page shell with safe area padding and bottom NavBar.
 *
 * Uses Telegram SDK viewport CSS variables (bound via viewport.bindCssVars())
 * for safe area insets instead of env(safe-area-inset-*) which fails silently
 * in Telegram WebView on iOS.
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <main
        className={cn(
          'flex-1 overflow-y-auto',
          'pt-[var(--spacing-content-top)]',
          'pb-[calc(56px+var(--spacing-safe-bottom))]',
          className,
        )}
      >
        {children}
      </main>
      <NavBar />
    </div>
  );
}
