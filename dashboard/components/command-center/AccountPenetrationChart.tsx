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

interface AccountPenetrationRow {
  month_start: string;
  month_label: string;
  parent_company_name: string;
  deals_won_count: number;
  _loaded_at: string;
}

interface AccountPenetrationChartProps {
  months?: number;
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

// Generate colors for different companies
const COLORS = [
  '#1570B6', // blue
  '#26A2DC', // light blue
  '#3B7E6B', // green
  '#A67FB9', // purple
  '#F47C44', // orange
  '#E3523A', // red
  '#7B7DN5', // indigo
  '#5DA37A', // teal
];

export default function AccountPenetrationChart({ months = 6 }: AccountPenetrationChartProps) {
  const { data, loading, error, refetch } = useQuery<{ data: AccountPenetrationRow[] }>(
    `account-penetration-${months}`,
    async () => {
      const params = new URLSearchParams();
      params.set('months', months.toString());
      const qs = params.toString();
      const url = '/api/command-center/account-penetration' + (qs ? `?${qs}` : '');
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
        <div className="h-80 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow" style={{ borderTopColor: '#F47C44' }}>
        <p className="text-sm" style={{ color: '#F47C44' }}>
          Failed to load account penetration data
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
        <p className="text-sm text-gray-500">No account penetration data available</p>
      </div>
    );
  }

  // Get unique companies
  const companies = [...new Set(rows.map(r => r.parent_company_name))];

  // Get unique months sorted
  const monthLabels = [...new Set(rows.map(r => r.month_label))]
    .sort((a, b) => {
      // Sort by month label (e.g., "Jan-24" < "Feb-24")
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

  // Pivot data for stacked bar chart
  const chartData = monthLabels.map(monthLabel => {
    const row: Record<string, string | number> = { month_label: monthLabel };
    companies.forEach(company => {
      const match = rows.find(r => r.month_label === monthLabel && r.parent_company_name === company);
      row[company] = match?.deals_won_count || 0;
    });
    return row;
  });

  return (
    <div className="card-glow">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Covr Singles - Account Penetration</h3>
        <p className="text-xs text-gray-500">Deals won by parent company over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month_label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
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
          {companies.map((company, index) => (
            <Bar
              key={company}
              dataKey={company}
              name={company}
              stackId="deals"
              fill={COLORS[index % COLORS.length]}
              radius={[0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
