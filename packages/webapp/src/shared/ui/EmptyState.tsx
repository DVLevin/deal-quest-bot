import type { LucideIcon } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export interface EmptyStateProps {
  /** Lucide icon component displayed in the accent circle */
  icon: LucideIcon;
  /** Primary title text */
  title: string;
  /** Supporting description */
  description: string;
  /** Optional call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Designed empty data state with icon, title, description, and optional CTA.
 *
 * Used when a query returns zero results (empty lead list, no attempts, etc.)
 * to guide the user toward their next action.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface-secondary/30 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <h3 className="text-sm font-semibold text-text-secondary">{title}</h3>
      <p className="max-w-[240px] text-xs text-text-hint">{description}</p>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
