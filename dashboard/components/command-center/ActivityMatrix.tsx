'use client';

import { useQuery } from '@/lib/hooks';

interface ActivityMatrixRow {
  owner_id: string;
  owner_name: string;
  calls_count: number;
  emails_count: number;
  meetings_count: number;
  prospecting_count: number;
  total_activities: number;
  _loaded_at: string;
}

interface ActivityMatrixProps {
  ownerId?: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export default function ActivityMatrix({ ownerId }: ActivityMatrixProps) {
  const { data, loading, error, refetch } = useQuery<{ data: ActivityMatrixRow[] }>(
    `activity-matrix-${ownerId || 'global'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) {
        params.set('owner_id', ownerId);
      }
      const qs = params.toString();
      const url = '/api/command-center/activity-matrix' + (qs ? `?${qs}` : '');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    }
  );

  const rows = data?.data || [];

  if (loading && rows.length === 0) {
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
          Failed to load activity matrix data
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

  if (rows.length === 0) {
    return (
      <div className="card-glow">
        <p className="text-sm text-gray-500">No activity matrix data available</p>
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
                Calls
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Emails
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Meetings
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Prospecting
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.owner_id}
                className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
              >
                <td className="py-3 px-4 text-sm font-medium">
                  {row.owner_name}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatNumber(row.calls_count)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatNumber(row.emails_count)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatNumber(row.meetings_count)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {formatNumber(row.prospecting_count)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums font-medium">
                  {formatNumber(row.total_activities)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
