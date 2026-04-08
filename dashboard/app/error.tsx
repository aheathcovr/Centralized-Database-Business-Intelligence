'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center max-w-md">
        <svg
          className="w-12 h-12 mx-auto mb-4"
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
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        {error.digest && (
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Error ID: {error.digest}
          </p>
        )}
        <button onClick={reset} className="btn-primary text-sm">
          Try again
        </button>
      </div>
    </div>
  );
}