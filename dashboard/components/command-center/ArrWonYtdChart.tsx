'use client';

import { useQuery } from '@/lib/hooks';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ArrWonYtdRow {
  period_start: string;
  period_label: string;
  period_type: 'monthly' | 'quarterly';
  deal_owner_name: string;
  arr_won: number;
  deals_won_count: number;
  _loaded_at: string;
}

interface ArrWonYtdChartProps {
  ownerId?: string;
  periodType?: 'monthly' | 'quarterly';
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span className="font-mono tabular-nums">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Color palette for different reps
const REP_COLORS = [
  '#1570B6', // Blue
  '#3B7E6B', // Green
  '#A67FB9', // Purple
  '#F47C44', // Orange
  '#26A2DC', // Light Blue
  '#6B7E6B', // Gray Green
  '#B9956F', // Tan
  '#DC3545', // Red
];

export default function ArrWonYtdChart({ ownerId, periodType }: ArrWonYtdChartProps) {
  const { data, loading, error, refetch } = useQuery<{ data: ArrWonYtdRow[] }>(
    `arr-won-ytd-${ownerId || 'global'}-${periodType || 'monthly'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) params.set('owner_id', ownerId);
      if (periodType) params.set('period_type', periodType);
      const qs = params.toString();
      const url = '/api/command-center/arr-won-ytd' + (qs ? `?${qs}` : '');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    }
  );

  const chartData = data?.data || [];

  if (loading && chartData.length === 0) {
    return (
      <div className="card-glow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-80 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow" style={{ borderTopColor: '#F47C44' }}>
        <p className="text-sm" style={{ color: '#F47C44' }}>
          Failed to load ARR Won YTD data
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

  if (chartData.length === 0) {
    return (
      <div className="card-glow">
        <p className="text-sm text-gray-500">No ARR Won YTD data available</p>
      </div>
    );
  }

  // Group data by period_label and pivot reps into columns
  const periods = [...new Set(chartData.map(d => d.period_label))].sort();
  const reps = [...new Set(chartData.map(d => d.deal_owner_name))].sort();

  const pivotedData = periods.map(period => {
    const periodData: Record<string, string | number> = { period };
    reps.forEach(rep => {
      const repData = chartData.find(d => d.period_label === period && d.deal_owner_name === rep);
      periodData[rep] = repData?.arr_won || 0;
    });
    return periodData;
  });

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">ARR Won YTD by Rep</h3>
        <p className="text-xs text-gray-500">
          {periodType === 'quarterly' ? 'Quarterly' : 'Monthly'} ARR won by sales rep
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={pivotedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
          {reps.map((rep, index) => (
            <Bar
              key={rep}
              dataKey={rep}
              name={rep}
              fill={REP_COLORS[index % REP_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
