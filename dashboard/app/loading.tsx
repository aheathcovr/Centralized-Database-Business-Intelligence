export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner" />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading…
        </p>
      </div>
    </div>
  );
}