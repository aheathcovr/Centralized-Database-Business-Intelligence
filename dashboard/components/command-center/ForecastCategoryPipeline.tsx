'use client';

import { useQuery } from '@/lib/hooks';

interface ForecastCategoryPipelineRow {
  forecast_category: string;
  owner_name: string | null;
  quarter: string | null;
  deals_count: number;
  total_arr: number;
  closedate: string | null;
}

interface ForecastCategoryPipelineProps {
  ownerId?: string;
  quarter?: string;
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

// Color coding for forecast categories
const FORECAST_COLORS: Record<string, string> = {
  'Commit': '#3B7E6B',
  'Best Case': '#1570B6',
  'Most Likely': '#26A2DC',
  'Pipeline': '#9CA3AF',
};

export default function ForecastCategoryPipeline({ ownerId, quarter }: ForecastCategoryPipelineProps) {
  const { data, loading, error, refetch } = useQuery<{ data: ForecastCategoryPipelineRow[] }>(
    `forecast-category-pipeline-${ownerId || 'global'}-${quarter || 'all'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) params.set('owner_id', ownerId);
      if (quarter) params.set('quarter', quarter);
      const qs = params.toString();
      const url = '/api/command-center/forecast-category-pipeline' + (qs ? `?${qs}` : '');
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
          Failed to load forecast category pipeline data
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
        <p className="text-sm text-gray-500">No forecast category pipeline data available</p>
      </div>
    );
  }

  // Check if data is grouped by owner or just by quarter
  const hasOwnerGrouping = tableData.some(d => d.owner_name !== null);
  const hasQuarterGrouping = tableData.some(d => d.quarter !== null);

  // Aggregate by forecast category
  const categoryTotals = tableData.reduce((acc, row) => {
    const existing = acc.find(d => d.forecast_category === row.forecast_category);
    if (existing) {
      existing.deals_count += row.deals_count;
      existing.total_arr += row.total_arr;
    } else {
      acc.push({
        forecast_category: row.forecast_category,
        deals_count: row.deals_count,
        total_arr: row.total_arr,
      });
    }
    return acc;
  }, [] as Array<{
    forecast_category: string;
    deals_count: number;
    total_arr: number;
  }>);

  // Sort by forecast category order
  const categoryOrder = ['Commit', 'Best Case', 'Most Likely', 'Pipeline'];
  categoryTotals.sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a.forecast_category);
    const bIdx = categoryOrder.indexOf(b.forecast_category);
    if (aIdx === -1 && bIdx === -1) return a.forecast_category.localeCompare(b.forecast_category);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  // Calculate totals
  const totalDeals = categoryTotals.reduce((sum, d) => sum + d.deals_count, 0);
  const totalArr = categoryTotals.reduce((sum, d) => sum + d.total_arr, 0);

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Pipeline by Forecast Category</h3>
        <p className="text-xs text-gray-500">
          Open pipeline breakdown by forecast category
          {hasQuarterGrouping && quarter && ` for ${quarter}`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Forecast Category</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Deals</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Total ARR</th>
            </tr>
          </thead>
          <tbody>
            {categoryTotals.map((row) => (
              <tr
                key={row.forecast_category}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: FORECAST_COLORS[row.forecast_category] || '#9CA3AF' }}
                    />
                    <span>{row.forecast_category}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">
                  {row.deals_count.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">
                  {formatCurrency(row.total_arr)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold bg-gray-50">
              <td className="py-2 px-3">Total</td>
              <td className="py-2 px-3 text-right font-mono tabular-nums">
                {totalDeals.toLocaleString()}
              </td>
              <td className="py-2 px-3 text-right font-mono tabular-nums">
                {formatCurrency(totalArr)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {hasOwnerGrouping && !hasQuarterGrouping && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Breakdown by Owner:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[...new Set(tableData.map(d => d.owner_name))].filter(Boolean).map(owner => {
              const ownerData = tableData.filter(d => d.owner_name === owner);
              const ownerDeals = ownerData.reduce((sum, d) => sum + d.deals_count, 0);
              const ownerArr = ownerData.reduce((sum, d) => sum + d.total_arr, 0);
              return (
                <div key={owner} className="text-xs bg-gray-50 rounded p-2">
                  <p className="font-medium truncate">{owner}</p>
                  <p className="text-gray-500">
                    {ownerDeals} deals · {formatCurrency(ownerArr)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
