import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

export interface ErrorCardProps {
  /** Error message to display */
  message?: string;
  /** Retry callback -- renders a retry button when provided */
  onRetry?: () => void;
  /** Compact mode: inline row instead of card block */
  compact?: boolean;
}

/**
 * Standardized error display component for failed queries and operations.
 *
 * - Default mode: renders inside a Card with centered icon, message, and optional retry button.
 * - Compact mode: renders a single inline row with icon, message, and optional retry text link.
 */
export function ErrorCard({ message = 'Failed to load data', onRetry, compact = false }: ErrorCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-error" />
        <span className="text-sm text-text-hint">{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-medium text-accent"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className="py-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <AlertCircle className="h-6 w-6 text-error" />
        <p className="text-sm text-text-hint">{message}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>
    </Card>
  );
}
