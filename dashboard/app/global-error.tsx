'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'var(--font-primary-sans, system-ui, sans-serif)',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
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
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginTop: '1rem',
              color: 'var(--text-primary, #283242)',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: 'var(--text-secondary, #696F7B)',
              marginTop: '0.5rem',
              textAlign: 'center',
              maxWidth: '28rem',
            }}
          >
            An unexpected error occurred. Please try again or contact support if
            the problem persists.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted, #9CA3AF)',
                marginTop: '0.5rem',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--accent, #1570B6)',
              color: '#FFFFFF',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}