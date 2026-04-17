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
  Line,
  ComposedChart,
  ResponsiveContainer,
} from 'recharts';

interface WeeklyOppsRow {
  week_start: string;
  week_label: string;
  owner_name: string;
  opps_added_count: number;
  arr_added: number;
  opps_type: string;
}

interface WeeklyOppsChartProps {
  ownerId?: string;
  startDate?: string;
  endDate?: string;
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
          <span className="font-mono tabular-nums">
            {entry.name.includes('Count')
              ? entry.value.toLocaleString()
              : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function WeeklyOppsChart({ ownerId, startDate, endDate }: WeeklyOppsChartProps) {
  const { data, loading, error, refetch } = useQuery<{ data: WeeklyOppsRow[] }>(
    `weekly-opps-${ownerId || 'global'}-${startDate || 'default'}-${endDate || 'default'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) params.set('owner_id', ownerId);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString();
      const url = '/api/command-center/weekly-opps' + (qs ? `?${qs}` : '');
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
          Failed to load weekly opps data
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
        <p className="text-sm text-gray-500">No weekly opps data available</p>
      </div>
    );
  }

  // Aggregate by week_label (sum counts and ARR across all opps types)
  const aggregatedData = chartData.reduce((acc, row) => {
    const existing = acc.find(d => d.week_label === row.week_label);
    if (existing) {
      existing.opps_added_count += row.opps_added_count;
      existing.arr_added += row.arr_added;
    } else {
      acc.push({
        week_label: row.week_label,
        opps_added_count: row.opps_added_count,
        arr_added: row.arr_added,
      });
    }
    return acc;
  }, [] as Array<{
    week_label: string;
    opps_added_count: number;
    arr_added: number;
  }>);

  // Sort by week_label
  aggregatedData.sort((a, b) => a.week_label.localeCompare(b.week_label));

  // Calculate a simple moving average for trend
  const trendData = aggregatedData.map((d, i) => {
    const windowSize = 4;
    const start = Math.max(0, i - windowSize + 1);
    const window = aggregatedData.slice(start, i + 1);
    const avg = window.reduce((sum, w) => sum + w.opps_added_count, 0) / window.length;
    return { ...d, trend: Math.round(avg) };
  });

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Weekly Opportunities Added</h3>
        <p className="text-xs text-gray-500">Opportunities added per week with trend line</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={trendData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week_label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
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
          <Bar
            yAxisId="left"
            dataKey="opps_added_count"
            name="Opps Count"
            fill="#1570B6"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="trend"
            name="Trend (4-wk avg)"
            stroke="#A67FB9"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#A67FB9', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
