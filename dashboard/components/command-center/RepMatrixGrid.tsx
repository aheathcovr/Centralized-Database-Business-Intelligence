'use client';

import { useQuery } from '@/lib/hooks';
import KpiCard from '@/components/KpiCard';

interface RepMatrixRow {
  owner_id: string;
  owner_name: string;
  total_revenue_past_365: number;
  ytd_asp: number;
  avg_days_to_close: number;
  win_rate_by_create_date: number;
  win_rate_by_close_date: number;
  _loaded_at: string;
}

interface RepMatrixGridProps {
  ownerId?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDays(value: number): string {
  return `${Math.round(value)} days`;
}

export default function RepMatrixGrid({ ownerId }: RepMatrixGridProps) {
  const { data, loading, error, refetch } = useQuery<{ data: RepMatrixRow[] }>(
    `rep-matrix-${ownerId || 'global'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) {
        params.set('owner_id', ownerId);
      }
      const qs = params.toString();
      const url = '/api/command-center/rep-matrix' + (qs ? `?${qs}` : '');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    }
  );

  const reps = data?.data || [];

  if (loading && reps.length === 0) {
    return (
      <div className="card-glow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow" style={{ borderTopColor: '#F47C44' }}>
        <p className="text-sm" style={{ color: '#F47C44' }}>
          Failed to load rep matrix data
        </p>
        <button
          onClick={() => refetch()}
          className="text-xs underline mt-1"
          style={{ color: 'var(--accent)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (reps.length === 0) {
    return (
      <div className="card-glow">
        <p className="text-sm text-gray-500">No rep matrix data available</p>
      </div>
    );
  }

  return (
    <div className="card-glow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Owner Name
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Total Revenue (Past 365)
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                YTD ASP
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Avg Days to Close
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Win Rate (Create Date)
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Win Rate (Close Date)
              </th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep, index) => (
              <tr
                key={rep.owner_id}
                className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
              >
                <td className="py-3 px-4 text-sm font-medium">
                  {rep.owner_name}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatCurrency(rep.total_revenue_past_365)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatCurrency(rep.ytd_asp)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatDays(rep.avg_days_to_close)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatPercent(rep.win_rate_by_create_date)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatPercent(rep.win_rate_by_close_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
