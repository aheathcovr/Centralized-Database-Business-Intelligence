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
  Cell,
} from 'recharts';

interface BookingsVsGoalRow {
  owner_name: string;
  period_type: 'annual' | 'quarterly';
  current_period: string;
  goal_arr: number;
  actual_arr: number;
  attainment_pct: number | null;
}

interface BookingsVsGoalChartProps {
  ownerId?: string;
  periodType?: 'annual' | 'quarterly';
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

  const goalData = payload.find(p => p.name === 'Goal');
  const actualData = payload.find(p => p.name === 'Actual');
  const attainment = goalData && actualData && goalData.value > 0
    ? ((actualData.value / goalData.value) * 100).toFixed(1)
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span className="font-mono tabular-nums">{formatCurrency(entry.value)}</span>
        </div>
      ))}
      {attainment && (
        <div className="flex items-center justify-between gap-4 text-sm mt-2 pt-2 border-t">
          <span className="text-gray-600">Attainment:</span>
          <span className="font-mono tabular-nums font-medium">
            {attainment}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function BookingsVsGoalChart({ ownerId, periodType }: BookingsVsGoalChartProps) {
  const { data, loading, error, refetch } = useQuery<{ data: BookingsVsGoalRow[] }>(
    `bookings-vs-goal-${ownerId || 'global'}-${periodType || 'annual'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) params.set('owner_id', ownerId);
      if (periodType) params.set('period_type', periodType);
      const qs = params.toString();
      const url = '/api/command-center/bookings-vs-goal' + (qs ? `?${qs}` : '');
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
          Failed to load bookings vs goal data
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
        <p className="text-sm text-gray-500">No bookings vs goal data available</p>
      </div>
    );
  }

  // Prepare data for grouped bar chart
  const groupedData = chartData.map(row => ({
    owner: row.owner_name,
    Goal: row.goal_arr,
    Actual: row.actual_arr,
    attainment: row.attainment_pct,
    isMet: row.actual_arr >= row.goal_arr,
  }));

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Bookings vs Goal</h3>
        <p className="text-xs text-gray-500">
          {periodType === 'quarterly' ? 'Quarterly' : 'Annual'} bookings by rep
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={groupedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            type="category"
            dataKey="owner"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
          <Bar
            dataKey="Goal"
            name="Goal"
            fill="#9CA3AF"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="Actual"
            name="Actual"
            radius={[0, 4, 4, 0]}
          >
            {groupedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isMet ? '#3B7E6B' : '#DC3545'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
