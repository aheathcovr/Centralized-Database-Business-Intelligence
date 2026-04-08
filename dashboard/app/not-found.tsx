import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
          404
        </h1>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Page not found
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="btn-primary text-sm">
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}