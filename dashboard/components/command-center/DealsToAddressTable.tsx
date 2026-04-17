'use client';

import { useQuery } from '@/lib/hooks';

interface DealsToAddressRow {
  deal_id: string;
  deal_name: string;
  owner_name: string;
  amount: number;
  closedate: string;
  days_past_close: number;
  stage_name: string;
  notes: string | null;
  _loaded_at: string;
}

interface DealsToAddressTableProps {
  ownerId?: string;
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

// Get row highlight color based on days past close
function getRowHighlight(daysPastClose: number): string | null {
  if (daysPastClose >= 90) return '#FEE2E2'; // Red-100
  if (daysPastClose >= 60) return '#FEF3C7'; // Amber-100
  if (daysPastClose >= 30) return '#FEF9C3'; // Yellow-100
  return null;
}

export default function DealsToAddressTable({ ownerId }: DealsToAddressTableProps) {
  const { data, loading, error, refetch } = useQuery<{ data: DealsToAddressRow[] }>(
    `deals-to-address-${ownerId || 'global'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) params.set('owner_id', ownerId);
      const qs = params.toString();
      const url = '/api/command-center/deals-to-address' + (qs ? `?${qs}` : '');
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
          Failed to load deals to address data
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
        <p className="text-sm text-gray-500">No deals past close date</p>
      </div>
    );
  }

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Deals Past Close Date</h3>
        <p className="text-xs text-gray-500">
          Deals requiring attention ({tableData.length} total)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Deal Name</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Owner</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Amount</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Original Close</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Days Past</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Stage</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => {
              const highlightColor = getRowHighlight(row.days_past_close);
              return (
                <tr
                  key={row.deal_id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                  style={highlightColor ? { backgroundColor: highlightColor } : undefined}
                >
                  <td className="py-2 px-3">
                    <span className="font-medium truncate max-w-[200px] block">
                      {row.deal_name}
                    </span>
                    {row.notes && (
                      <span className="text-xs text-gray-500 truncate max-w-[200px] block">
                        {row.notes}
                      </span>
                    )}
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
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    <span
                      className={`font-medium ${
                        row.days_past_close >= 60
                          ? 'text-red-600'
                          : row.days_past_close >= 30
                          ? 'text-amber-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {row.days_past_close}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {row.stage_name}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FEE2E2' }} />
            <span>90+ days</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FEF3C7' }} />
            <span>60-89 days</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FEF9C3' }} />
            <span>30-59 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
