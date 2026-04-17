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

interface PipelineGenerationRow {
  period_start: string;
  period_label: string;
  quarter_start: string;
  quarter_label: string;
  owner_id: string;
  owner_full_name: string;
  period_type: string;
  deals_created: number;
  pipeline_amount: number;
  avg_deal_amount: number;
  meetings_booked: number;
  outbound_amount?: number;
  inbound_amount?: number;
  _loaded_at: string;
}

interface PipelineGenerationChartProps {
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
            {entry.name.includes('Opp') || entry.name.includes('Count')
              ? entry.value.toLocaleString()
              : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PipelineGenerationChart({ startDate, endDate }: PipelineGenerationChartProps) {
  const { data, loading, error, refetch } = useQuery<{ data: PipelineGenerationRow[] }>(
    `pipeline-generation-${startDate || 'default'}-${endDate || 'default'}`,
    async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString();
      const url = '/api/command-center/pipeline-generation' + (qs ? `?${qs}` : '');
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
          Failed to load pipeline generation data
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
        <p className="text-sm text-gray-500">No pipeline generation data available</p>
      </div>
    );
  }

  // Prepare data for stacked bar chart
  // Group by period_label and sum amounts
  const aggregatedData = chartData.reduce((acc, row) => {
    const existing = acc.find(d => d.period_label === row.period_label);
    if (existing) {
      existing.pipeline_amount += row.pipeline_amount;
      existing.outbound_amount = (existing.outbound_amount || 0) + (row.outbound_amount || 0);
      existing.inbound_amount = (existing.inbound_amount || 0) + (row.inbound_amount || 0);
      existing.deals_created += row.deals_created;
    } else {
      acc.push({
        period_label: row.period_label,
        pipeline_amount: row.pipeline_amount,
        outbound_amount: row.outbound_amount || 0,
        inbound_amount: row.inbound_amount || 0,
        deals_created: row.deals_created,
      });
    }
    return acc;
  }, [] as Array<{
    period_label: string;
    pipeline_amount: number;
    outbound_amount: number;
    inbound_amount: number;
    deals_created: number;
  }>);

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Pipeline Generation & Top of Funnel</h3>
        <p className="text-xs text-gray-500">Monthly pipeline amount (stacked) and opportunity count</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={aggregatedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period_label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => value.toLocaleString()}
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
            dataKey="outbound_amount"
            name="Outbound ARR"
            stackId="arr"
            fill="#1570B6"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="inbound_amount"
            name="Inbound ARR"
            stackId="arr"
            fill="#26A2DC"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="pipeline_amount"
            name="Total ARR"
            fill="#3B7E6B"
            radius={[4, 4, 0, 0]}
            hide
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="deals_created"
            name="Opps Count"
            stroke="#A67FB9"
            strokeWidth={2}
            dot={{ fill: '#A67FB9', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
