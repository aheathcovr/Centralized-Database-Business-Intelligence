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

interface DealsWonLostAddedRow {
  month_start: string;
  month_label: string;
  deals_won_count: number;
  deals_lost_count: number;
  deals_nurtured_count: number;
  deals_added_count: number;
  arr_won: number;
  arr_lost: number;
  arr_added: number;
  _loaded_at: string;
}

interface DealsFlowChartProps {
  startDate?: string;
  endDate?: string;
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
          <span className="font-mono tabular-nums">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function DealsFlowChart({ startDate, endDate }: DealsFlowChartProps) {
  const { data, loading, error, refetch } = useQuery<{ data: DealsWonLostAddedRow[] }>(
    `deals-won-lost-added-${startDate || 'default'}-${endDate || 'default'}`,
    async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString();
      const url = '/api/command-center/deals-won-lost-added' + (qs ? `?${qs}` : '');
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
          Failed to load deals flow data
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
        <p className="text-sm text-gray-500">No deals flow data available</p>
      </div>
    );
  }

  // Prepare data for stacked bar chart (won, lost/nurtured, added)
  const chartDataFormatted = chartData.map(row => ({
    month: row.month_label,
    Won: row.deals_won_count,
    'Lost/Nurtured': row.deals_lost_count + row.deals_nurtured_count,
    Added: row.deals_added_count,
  }));

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Deals Flow</h3>
        <p className="text-xs text-gray-500">Monthly won, lost/nurtured, and added deals</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartDataFormatted}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
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
            dataKey="Won"
            name="Won"
            stackId="deals"
            fill="#3B7E6B"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Lost/Nurtured"
            name="Lost/Nurtured"
            stackId="deals"
            fill="#DC3545"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Added"
            name="Added"
            stackId="deals"
            fill="#1570B6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
