'use client';

import { useState } from 'react';
import { useQuery } from '@/lib/hooks';

interface FunnelEconomicsRow {
  lead_source: string;
  facility_deal_count: number;
  facility_win_rate_pct: number;
  facility_avg_arr: number;
  corporate_deal_count: number;
  corporate_win_rate_pct: number;
  corporate_avg_arr: number;
  total_deal_count: number;
  _loaded_at: string;
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
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

type TabValue = 'facility' | 'corporate';

export default function EconomicsTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>('facility');

  const { data, loading, error, refetch } = useQuery<{ data: FunnelEconomicsRow[] }>(
    'funnel-economics',
    async () => {
      const url = '/api/command-center/funnel-economics';
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
          Failed to load funnel economics data
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
        <p className="text-sm text-gray-500">No funnel economics data available</p>
      </div>
    );
  }

  return (
    <div className="card-glow overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('facility')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'facility'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Facility
        </button>
        <button
          onClick={() => setActiveTab('corporate')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'corporate'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Corporate
        </button>
      </div>

      {/* Tab Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Lead Source
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Deal Count
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Win Rate %
              </th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Avg ARR
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.lead_source}
                className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
              >
                <td className="py-3 px-4 text-sm font-medium">
                  {row.lead_source}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {activeTab === 'facility'
                    ? formatNumber(row.facility_deal_count)
                    : formatNumber(row.corporate_deal_count)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {activeTab === 'facility'
                    ? formatPercent(row.facility_win_rate_pct)
                    : formatPercent(row.corporate_win_rate_pct)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono tabular-nums">
                  {activeTab === 'facility'
                    ? formatCurrency(row.facility_avg_arr)
                    : formatCurrency(row.corporate_avg_arr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
