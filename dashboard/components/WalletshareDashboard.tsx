'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
} from 'recharts';

interface WalletshareData {
  clickup_task_id: string;
  corporation_name: string;
  task_status_label: string;
  customer_type_label: string | null;
  product_mix: string;
  total_facilities: number;
  facilities_in_dh: number;
  penetration_rate: number;
  active_facilities: number;
  walletshare_pct: number;
  active_flow_only_facilities: number;
  active_view_only_facilities: number;
  active_flow_and_view_facilities: number;
  active_sync_facilities: number;
  win_back_facilities: number;
  no_start_facilities: number;
  stalled_facilities: number;
  untapped_dh_only_facilities: number;
  total_opportunity_facilities: number;
  task_created_timestamp: string | null;
}

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  'Flow + View': '#8B5CF6',
  'Flow': '#3B82F6',
  'View': '#F97316',
  'Sync': '#FBBF24',
  'Unknown': '#9CA3AF',
};

const STATUS_COLORS: Record<string, string> = {
  'Active': '#3B7E6B',
  'Implementation': '#1570B6',
};

function groupByCustomerType(data: WalletshareData[]) {
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    const label = d.customer_type_label || 'Unknown';
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

function formatMonthKey(ts: string) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function buildMonthlyData(data: WalletshareData[]) {
  const months: Record<string, Record<string, number>> = {};
  const typeSet = new Set<string>();

  data.forEach((d) => {
    if (!d.task_created_timestamp) return;
    const key = formatMonthKey(d.task_created_timestamp);
    const label = d.customer_type_label || 'Unknown';
    if (!months[key]) months[key] = {};
    months[key][label] = (months[key][label] || 0) + 1;
    typeSet.add(label);
  });

  const rows = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, counts]) => ({ month: formatMonthLabel(key), ...counts }));

  const customerTypes = Array.from(typeSet).sort();
  return { rows, customerTypes };
}

function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number;
    innerRadius: number; outerRadius: number; percent: number;
  }) => {
    if (percent < 0.06) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {Math.round(percent * 100)}%
      </text>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ResponsiveContainer width={240} height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={110}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={CUSTOMER_TYPE_COLORS[entry.name] || '#9CA3AF'} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [`${v}`, 'Corporations']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-500">total</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-sm">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CUSTOMER_TYPE_COLORS[entry.name] || '#9CA3AF' }} />
            <span className="text-gray-600">{entry.name}</span>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrossSellChart({ data }: { data: { name: string; 'Active Facilities': number; Untapped: number; status: string }[] }) {
  const height = Math.max(280, data.length * 32 + 80);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 40, left: 180, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Facilities', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={175} />
        <Tooltip />
        <Legend />
        <Bar dataKey="Active Facilities" stackId="a" fill="#3B82F6">
          {data.map((entry, i) => (
            <Cell key={i} fill={STATUS_COLORS[entry.status] || '#3B82F6'} />
          ))}
        </Bar>
        <Bar dataKey="Untapped" stackId="a" fill="#E5E7EB" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function WalletshareDashboard() {
  const [data, setData] = useState<WalletshareData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await globalThis.fetch('/api/walletshare');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading walletshare data...</p></div>;
  if (error) return <div className="flex items-center justify-center h-64"><p className="text-red-500">Error: {error}</p></div>;

  const activeCorps = data.filter((d) => d.task_status_label === 'Active');
  const implCorps = data.filter((d) => d.task_status_label === 'Implementation');

  const activeDonutData = groupByCustomerType(activeCorps);
  const implDonutData = groupByCustomerType(implCorps);

  const { rows: monthlyRows, customerTypes } = buildMonthlyData(data);

  const flowCrossSellData = data
    .filter((d) =>
      (d.task_status_label === 'Active' || d.task_status_label === 'Implementation') &&
      d.customer_type_label === 'Flow'
    )
    .sort((a, b) => b.active_facilities - a.active_facilities)
    .map((d) => ({
      name: d.corporation_name,
      'Active Facilities': d.active_flow_only_facilities,
      Untapped: d.untapped_dh_only_facilities,
      status: d.task_status_label,
    }));

  const viewCrossSellData = data
    .filter((d) =>
      (d.task_status_label === 'Active' || d.task_status_label === 'Implementation') &&
      d.customer_type_label === 'View'
    )
    .sort((a, b) => b.active_facilities - a.active_facilities)
    .map((d) => ({
      name: d.corporation_name,
      'Active Facilities': d.active_view_only_facilities,
      Untapped: d.untapped_dh_only_facilities,
      status: d.task_status_label,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Corporate Walletshare</h1>
        <p className="text-gray-500 mt-1">Facility penetration and opportunity analysis across {data.length} corporations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Active Corporations"
          value={activeCorps.length.toLocaleString()}
          sub={`${implCorps.length} in implementation`}
        />
        <SummaryCard
          label="Active Facilities"
          value={activeCorps.reduce((s, d) => s + d.active_facilities, 0).toLocaleString()}
          sub={`${data.reduce((s, d) => s + d.total_facilities, 0).toLocaleString()} total facilities`}
        />
        <SummaryCard
          label="Win-Back Opportunities"
          value={data.reduce((s, d) => s + d.win_back_facilities, 0).toLocaleString()}
          sub="churned facilities"
        />
        <SummaryCard
          label="Untapped DH"
          value={data.reduce((s, d) => s + d.untapped_dh_only_facilities, 0).toLocaleString()}
          sub="DH facilities not in ClickUp"
        />
      </div>

      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Active Corporations by Customer Type"
          description={`${activeCorps.length} corporations with status = Active`}
        >
          <DonutChart data={activeDonutData} />
        </ChartCard>

        <ChartCard
          title="Implementation Corporations by Customer Type"
          description={`${implCorps.length} corporations with status = Implementation`}
        >
          <DonutChart data={implDonutData} />
        </ChartCard>
      </div>

      {/* Stacked Bar: Created by Month */}
      <ChartCard
        title="Corporations Created by Month"
        description="Count of ClickUp corporation tasks by creation date, stacked by customer type"
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyRows} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
            />
            <Tooltip />
            <Legend />
            {customerTypes.map((type) => (
              <Bar key={type} dataKey={type} stackId="a" fill={CUSTOMER_TYPE_COLORS[type] || '#9CA3AF'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Cross-sell: Flow → View */}
      <ChartCard
        title="Flow Customers — View Cross-Sell Candidates"
        description={`${flowCrossSellData.length} active/implementation corporations with customer type = Flow`}
      >
        {flowCrossSellData.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No matching corporations</p>
        ) : (
          <CrossSellChart data={flowCrossSellData} />
        )}
      </ChartCard>

      {/* Cross-sell: View → Flow */}
      <ChartCard
        title="View Customers — Flow Cross-Sell Candidates"
        description={`${viewCrossSellData.length} active/implementation corporations with customer type = View`}
      >
        {viewCrossSellData.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No matching corporations</p>
        ) : (
          <CrossSellChart data={viewCrossSellData} />
        )}
      </ChartCard>

      {/* Data Table */}
      <ChartCard title="Corporation Details" description={`${data.length} corporations`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-medium text-gray-700">Corporation</th>
                <th className="text-left p-2 font-medium text-gray-700">Status</th>
                <th className="text-left p-2 font-medium text-gray-700">Customer Type</th>
                <th className="text-right p-2 font-medium text-gray-700">Total</th>
                <th className="text-right p-2 font-medium text-gray-700">Active</th>
                <th className="text-right p-2 font-medium text-gray-700">Walletshare</th>
                <th className="text-right p-2 font-medium text-gray-700">Win-Back</th>
                <th className="text-right p-2 font-medium text-gray-700">No-Start</th>
                <th className="text-right p-2 font-medium text-gray-700">Untapped</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.clickup_task_id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium text-gray-900">{d.corporation_name}</td>
                  <td className="p-2 text-gray-600">{d.task_status_label}</td>
                  <td className="p-2 text-gray-600">{d.customer_type_label || '—'}</td>
                  <td className="p-2 text-right text-gray-700">{d.total_facilities}</td>
                  <td className="p-2 text-right text-gray-700">{d.active_facilities}</td>
                  <td className="p-2 text-right text-gray-700">{d.walletshare_pct.toFixed(1)}%</td>
                  <td className="p-2 text-right text-red-600">{d.win_back_facilities}</td>
                  <td className="p-2 text-right text-amber-600">{d.no_start_facilities}</td>
                  <td className="p-2 text-right text-gray-400">{d.untapped_dh_only_facilities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1 text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}
