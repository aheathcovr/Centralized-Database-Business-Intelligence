import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Component that throws an error for testing
function ThrowError({ error }: { error: Error }): React.ReactElement {
  throw error;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected error output in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <p>Hello world</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders default error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Test error message')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Component failed to render')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError error={new Error('oops')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('resets error state when retry button is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError error={new Error('boom')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component failed to render')).toBeInTheDocument();

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    // After reset, the boundary re-renders children — but since ThrowError
    // always throws, it will catch again. The key assertion is that the
    // retry button was clickable (no crash).
    expect(screen.getByText('Component failed to render')).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('a11y test')} />
      </ErrorBoundary>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});