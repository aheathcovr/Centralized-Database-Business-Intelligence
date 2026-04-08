/**
 * Lazy-loaded chart components using Next.js dynamic imports.
 *
 * These wrappers code-split the Recharts library so it's not included
 * in the initial page bundle. Each chart loads on demand with a
 * skeleton fallback while the chunk is being fetched.
 *
 * Usage (instead of importing directly from ./index):
 *   import { WaterfallChart } from '@/components/charts/lazy';
 */
import dynamic from 'next/dynamic';

const WaterfallChart = dynamic(() => import('./WaterfallChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const BulletChart = dynamic(() => import('./BulletChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const FunnelChart = dynamic(() => import('./FunnelChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

export { WaterfallChart, BulletChart, FunnelChart };

/** Minimal skeleton placeholder shown while chart chunk loads */
function ChartSkeleton() {
  return (
    <div
      className="card flex items-center justify-center"
      style={{ minHeight: 200 }}
      aria-label="Loading chart…"
      role="status"
    >
      <div className="spinner" />
    </div>
  );
}