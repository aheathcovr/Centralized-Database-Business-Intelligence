'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Treemap, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

interface WalletshareData {
  clickup_task_id: string;
  corporation_name: string;
  task_status_label: string;
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
}

const COLORS = {
  flowAndView: '#8B5CF6',
  flow: '#3B82F6',
  view: '#F97316',
  sync: '#FBBF24',
  winBack: '#EF4444',
  noStart: '#F59E0B',
  stalled: '#9CA3AF',
  untapped: '#D1D5DB',
};

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

  const chart1Data = data.map((d) => ({
    name: d.corporation_name,
    'Flow + View': d.active_flow_and_view_facilities,
    'Flow': d.active_flow_only_facilities,
    'View': d.active_view_only_facilities,
    'Win-Back': d.win_back_facilities,
    'No-Start': d.no_start_facilities,
    'Stalled': d.stalled_facilities,
    'Untapped': d.untapped_dh_only_facilities,
  }));

  const chart2Data = data.filter((d) => d.total_facilities > 0).map((d) => ({
    name: d.corporation_name,
    size: d.total_facilities,
    walletshare: d.walletshare_pct,
    fill: d.walletshare_pct >= 75 ? '#10B981' : d.walletshare_pct >= 50 ? '#3B82F6' : d.walletshare_pct >= 25 ? '#F59E0B' : '#EF4444',
  }));

  const chart3Data = data.filter((d) => d.total_facilities > 0).map((d) => ({
    x: d.total_facilities,
    y: d.walletshare_pct,
    z: d.active_facilities,
    name: d.corporation_name,
    status: d.task_status_label,
    fill: d.task_status_label === 'Active' ? '#10B981'
      : d.task_status_label === 'Churned' ? '#EF4444'
      : d.task_status_label === 'Implementation' ? '#3B82F6'
      : '#9CA3AF',
  }));

  const chart5Bins = [
    { range: '0-10%', count: data.filter(d => d.walletshare_pct > 0 && d.walletshare_pct <= 10).length, fill: '#EF4444' },
    { range: '11-25%', count: data.filter(d => d.walletshare_pct > 10 && d.walletshare_pct <= 25).length, fill: '#F59E0B' },
    { range: '26-50%', count: data.filter(d => d.walletshare_pct > 25 && d.walletshare_pct <= 50).length, fill: '#FBBF24' },
    { range: '51-75%', count: data.filter(d => d.walletshare_pct > 50 && d.walletshare_pct <= 75).length, fill: '#3B82F6' },
    { range: '76-100%', count: data.filter(d => d.walletshare_pct > 75).length, fill: '#10B981' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Corporate Walletshare</h1>
        <p className="text-gray-500 mt-1">Facility penetration and opportunity analysis across {data.length} corporations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Active Facilities"
          value={data.reduce((s, d) => s + d.active_facilities, 0).toLocaleString()}
          sub={`${data.reduce((s, d) => s + d.total_facilities, 0).toLocaleString()} total`}
        />
        <SummaryCard
          label="Avg Walletshare"
          value={`${data.length > 0 ? (data.reduce((s, d) => s + d.walletshare_pct, 0) / data.length).toFixed(1) : 0}%`}
          sub="of total facilities"
        />
        <SummaryCard
          label="Win-Back Ops"
          value={data.reduce((s, d) => s + d.win_back_facilities, 0).toLocaleString()}
          sub="churned facilities"
        />
        <SummaryCard
          label="Untapped DH"
          value={data.reduce((s, d) => s + d.untapped_dh_only_facilities, 0).toLocaleString()}
          sub="DH facilities not in ClickUp"
        />
      </div>

      {/* Chart 1: Stacked Bar - Walletshare Decomposition by Corporation */}
      <ChartCard title="Walletshare Decomposition by Corporation" description="Active facilities broken down by product, plus opportunity categories">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chart1Data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Flow + View" stackId="a" fill={COLORS.flowAndView} />
            <Bar dataKey="Flow" stackId="a" fill={COLORS.flow} />
            <Bar dataKey="View" stackId="a" fill={COLORS.view} />
            <Bar dataKey="Win-Back" stackId="a" fill={COLORS.winBack} />
            <Bar dataKey="No-Start" stackId="a" fill={COLORS.noStart} />
            <Bar dataKey="Stalled" stackId="a" fill={COLORS.stalled} />
            <Bar dataKey="Untapped" stackId="a" fill={COLORS.untapped} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 2: Treemap - Corporate Walletshare Scale */}
      <ChartCard title="Corporate Walletshare Treemap" description="Size = total facilities, Color = walletshare %">
        <ResponsiveContainer width="100%" height={400}>
          <Treemap
            data={chart2Data}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            fill="#8884d8"
          >
            {chart2Data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <Tooltip
              content={({ payload }) => {
                if (payload && payload[0]) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white p-2 rounded shadow text-xs">
                      <div className="font-bold">{d.name}</div>
                      <div>Facilities: {d.size}</div>
                      <div>Walletshare: {d.walletshare.toFixed(1)}%</div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 3: Scatter Plot - Opportunity Sizing */}
      <ChartCard title="Walletshare Scatter Plot" description="X=Total DH Facilities, Y=Walletshare %, Size=Active Facilities, Color=Status">
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Total Facilities" unit=" facilities" />
            <YAxis type="number" dataKey="y" name="Walletshare" unit="%" />
            <ZAxis type="number" dataKey="z" range={[50, 400]} name="Active" unit=" facilities" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (payload && payload[0]) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white p-2 rounded shadow text-xs">
                      <div className="font-bold">{d.name}</div>
                      <div>Total: {d.x} facilities</div>
                      <div>Walletshare: {d.y.toFixed(1)}%</div>
                      <div>Active: {d.z} facilities</div>
                      <div>Status: {d.status}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Scatter name="Active" data={chart3Data.filter(d => d.status === 'Active')} fill={COLORS.winBack} />
            <Scatter name="Churned" data={chart3Data.filter(d => d.status === 'Churned')} fill="#EF4444" />
            <Scatter name="Implementation" data={chart3Data.filter(d => d.status === 'Implementation')} fill="#3B82F6" />
            <Scatter name="Other" data={chart3Data.filter(d => !['Active', 'Churned', 'Implementation'].includes(d.status))} fill="#9CA3AF" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 5: Walletshare Distribution Histogram */}
      <ChartCard title="Walletshare Distribution" description="Histogram of corporations by walletshare % range">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chart5Bins} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6">
              {chart5Bins.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Data Table */}
      <ChartCard title="Corporation Details" description={data.length}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2">Corporation</th>
                <th className="text-right p-2">Total</th>
                <th className="text-right p-2">Active</th>
                <th className="text-right p-2">Walletshare</th>
                <th className="text-right p-2">Win-Back</th>
                <th className="text-right p-2">No-Start</th>
                <th className="text-right p-2">Untapped</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.clickup_task_id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{d.corporation_name}</td>
                  <td className="p-2 text-right">{d.total_facilities}</td>
                  <td className="p-2 text-right">{d.active_facilities}</td>
                  <td className="p-2 text-right">{d.walletshare_pct.toFixed(1)}%</td>
                  <td className="p-2 text-right text-red-600">{d.win_back_facilities}</td>
                  <td className="p-2 text-right text-yellow-600">{d.no_start_facilities}</td>
                  <td className="p-2 text-right text-gray-500">{d.untapped_dh_only_facilities}</td>
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
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description?: string | number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500">{typeof description === 'number' ? description : description}</p>}
      </div>
      {children}
    </div>
  );
}