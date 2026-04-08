'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches rendering errors in child components.
 *
 * Use this to wrap chart components, data tables, or any subtree that
 * might throw during render. Next.js route-level `error.tsx` handles
 * full-page errors; this handles component-level errors gracefully.
 *
 * @example
 * <ErrorBoundary fallback={<ChartError />}>
 *   <ExpensiveChart data={data} />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in dev; replace with error reporting service in prod
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="card flex flex-col items-center justify-center py-12"
          role="alert"
          aria-live="polite"
        >
          <svg
            className="w-8 h-8 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#F47C44"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Component failed to render
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button onClick={this.handleReset} className="btn-secondary text-xs">
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}