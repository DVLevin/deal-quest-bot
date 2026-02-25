import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React 18 class component error boundary.
 *
 * Catches unhandled render errors anywhere in the tree and displays
 * a branded fallback page with a retry button instead of a white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <AlertTriangle className="h-7 w-7 text-error" />
          </div>
          <h1 className="text-lg font-semibold text-text-primary">
            Something went wrong
          </h1>
          <p className="max-w-[280px] text-sm text-text-secondary">
            The app encountered an unexpected error. Try refreshing.
          </p>
          <Button onClick={this.handleRetry}>Try Again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
