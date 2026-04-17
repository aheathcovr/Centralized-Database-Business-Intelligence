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

interface AeOutboundPipelineRow {
  week_start: string;
  week_label: string;
  owner_name: string;
  outbound_opps_count: number;
  outbound_arr: number;
}

interface AeOutboundPipelineChartProps {
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

export default function AeOutboundPipelineChart({ ownerId, startDate, endDate }: AeOutboundPipelineChartProps) {
  const { data, loading, error, refetch } = useQuery<{ data: AeOutboundPipelineRow[] }>(
    `ae-outbound-pipeline-${ownerId || 'global'}-${startDate || 'default'}-${endDate || 'default'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) params.set('owner_id', ownerId);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString();
      const url = '/api/command-center/ae-outbound-pipeline' + (qs ? `?${qs}` : '');
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
          Failed to load AE outbound pipeline data
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
        <p className="text-sm text-gray-500">No AE outbound pipeline data available</p>
      </div>
    );
  }

  // Check if data is grouped by owner (multiple owners in data)
  const hasMultipleOwners = new Set(chartData.map(d => d.owner_name)).size > 1;

  if (hasMultipleOwners) {
    // Group by owner and week for stacked chart
    const weeks = [...new Set(chartData.map(d => d.week_label))].sort();
    const owners = [...new Set(chartData.map(d => d.owner_name))].sort();

    const pivotedData = weeks.map(week => {
      const weekData: Record<string, string | number> = { week };
      owners.forEach(owner => {
        const ownerWeekData = chartData.find(d => d.week_label === week && d.owner_name === owner);
        weekData[owner] = ownerWeekData?.outbound_arr || 0;
        weekData[`${owner}_count`] = ownerWeekData?.outbound_opps_count || 0;
      });
      return weekData;
    });

    return (
      <div className="card-glow">
        <div className="mb-4">
          <h3 className="text-sm font-medium">AE Outbound Pipeline by Rep</h3>
          <p className="text-xs text-gray-500">Weekly outbound pipeline creation by AE</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={pivotedData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="week"
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
            {owners.map((owner, index) => (
              <Bar
                key={owner}
                dataKey={owner}
                name={`${owner} ARR`}
                stackId="arr"
                fill={['#1570B6', '#3B7E6B', '#A67FB9', '#F47C44', '#26A2DC'][index % 5]}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Single owner or aggregate view - simple bar chart
  const aggregatedData = chartData.reduce((acc, row) => {
    const existing = acc.find(d => d.week_label === row.week_label);
    if (existing) {
      existing.outbound_opps_count += row.outbound_opps_count;
      existing.outbound_arr += row.outbound_arr;
    } else {
      acc.push({
        week_label: row.week_label,
        outbound_opps_count: row.outbound_opps_count,
        outbound_arr: row.outbound_arr,
      });
    }
    return acc;
  }, [] as Array<{
    week_label: string;
    outbound_opps_count: number;
    outbound_arr: number;
  }>);

  aggregatedData.sort((a, b) => a.week_label.localeCompare(b.week_label));

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">AE Outbound Pipeline</h3>
        <p className="text-xs text-gray-500">Weekly outbound opportunity creation</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={aggregatedData}
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
            dataKey="outbound_opps_count"
            name="Opps Count"
            fill="#1570B6"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="outbound_arr"
            name="Outbound ARR"
            fill="#3B7E6B"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
