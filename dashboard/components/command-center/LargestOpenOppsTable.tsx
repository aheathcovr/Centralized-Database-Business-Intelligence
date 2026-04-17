'use client';

import { useQuery } from '@/lib/hooks';

interface LargestOpenOppsRow {
  deal_id: string;
  deal_name: string;
  owner_name: string;
  amount: number;
  closedate: string;
  forecast_category: string;
  stage_name: string;
  quarter: string;
  _loaded_at: string;
}

interface LargestOpenOppsTableProps {
  limit?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Color coding for forecast categories
const FORECAST_COLORS: Record<string, string> = {
  'Commit': '#3B7E6B',
  'Best Case': '#1570B6',
  'Most Likely': '#26A2DC',
  'Pipeline': '#9CA3AF',
};

export default function LargestOpenOppsTable({ limit = 10 }: LargestOpenOppsTableProps) {
  const { data, loading, error, refetch } = useQuery<{ data: LargestOpenOppsRow[] }>(
    `largest-open-opps-${limit}`,
    async () => {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      const qs = params.toString();
      const url = '/api/command-center/largest-open-opps' + (qs ? `?${qs}` : '');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    }
  );

  const tableData = data?.data || [];

  if (loading && tableData.length === 0) {
    return (
      <div className="card-glow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow" style={{ borderTopColor: '#F47C44' }}>
        <p className="text-sm" style={{ color: '#F47C44' }}>
          Failed to load largest open opps data
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

  if (tableData.length === 0) {
    return (
      <div className="card-glow">
        <p className="text-sm text-gray-500">No largest open opps data available</p>
      </div>
    );
  }

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Largest Open Opportunities</h3>
        <p className="text-xs text-gray-500">Top {tableData.length} open deals by ARR</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Deal Name</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Owner</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Amount</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Close Date</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Forecast</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr
                key={row.deal_id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3">
                  <span className="font-medium truncate max-w-[200px] block">
                    {row.deal_name}
                  </span>
                  <span className="text-xs text-gray-500">{row.stage_name}</span>
                </td>
                <td className="py-2 px-3 text-gray-600">
                  {row.owner_name}
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums font-medium">
                  {formatCurrency(row.amount)}
                </td>
                <td className="py-2 px-3 text-gray-600">
                  {formatDate(row.closedate)}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: FORECAST_COLORS[row.forecast_category] || '#9CA3AF' }}
                    />
                    <span className="text-gray-600">{row.forecast_category}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
