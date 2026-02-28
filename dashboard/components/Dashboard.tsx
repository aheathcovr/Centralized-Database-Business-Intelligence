'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
  LabelList,
} from 'recharts';

interface Corporation {
  clickup_task_id: string;
  corporation_name: string;
  task_status: string;
  task_status_label: string;
  customer_type_label: string | null;
  hubspot_url: string | null;
  hubspot_company_id: string | null;
  total_facilities: number;
  facilities_in_dh: number;
  facilities_matched: number;
  penetration_rate: number;
  product_mix: string;
}

interface Stats {
  total_corporations: number;
  active_status_count: number;
  churned_status_count: number;
  implementation_status_count: number;
  stalled_status_count: number;
  offboarding_status_count: number;
  flow_customers: number;
  view_customers: number;
  sync_customers: number;
  avg_penetration_rate: number;
  total_facilities: number;
  total_facilities_in_dh: number;
  // Facility counts by corporation status
  active_facilities: number;
  active_facilities_in_dh: number;
  churned_facilities: number;
  churned_facilities_in_dh: number;
  implementation_facilities: number;
  implementation_facilities_in_dh: number;
  stalled_facilities: number;
  stalled_facilities_in_dh: number;
  offboarding_facilities: number;
  offboarding_facilities_in_dh: number;
  data_loaded_at: string;
}

interface DashboardProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const COLORS = ['#1e40af', '#0d9488', '#059669', '#7c3aed', '#dc2626'];

export default function Dashboard({ user }: DashboardProps) {
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/corporations');
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data = await response.json();
      setCorporations(data.corporations);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCorporations = corporations.filter((corp) => {
    const matchesTaskStatus =
      selectedTaskStatus === 'all' || corp.task_status_label === selectedTaskStatus;
    const matchesProduct =
      selectedProduct === 'all' || corp.product_mix.includes(selectedProduct);
    const matchesSearch =
      searchQuery === '' ||
      corp.corporation_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTaskStatus && matchesProduct && matchesSearch;
  });

  const productMixData = [
    { name: 'Flow', value: stats?.flow_customers || 0 },
    { name: 'View', value: stats?.view_customers || 0 },
    { name: 'Sync', value: stats?.sync_customers || 0 },
  ].filter((item) => item.value > 0);

  // Customer Status Data (from ClickUp task status)
  const taskStatusData = [
    { name: 'Active', count: stats?.active_status_count || 0 },
    { name: 'Churned', count: stats?.churned_status_count || 0 },
    { name: 'Implementation', count: stats?.implementation_status_count || 0 },
    { name: 'Stalled', count: stats?.stalled_status_count || 0 },
    { name: 'Offboarding', count: stats?.offboarding_status_count || 0 },
  ].filter((item) => item.count > 0);

  const penetrationData = filteredCorporations
    .slice(0, 10)
    .map((corp) => ({
      name: corp.corporation_name.length > 20
        ? corp.corporation_name.substring(0, 20) + '...'
        : corp.corporation_name,
      penetration: Math.round((corp.penetration_rate || 0) * 100),
      facilities: corp.total_facilities,
    }));

  const facilitiesByStatusData = [
    {
      status: 'Active',
      matched: stats?.active_facilities_in_dh || 0,
      unmatched: (stats?.active_facilities || 0) - (stats?.active_facilities_in_dh || 0),
    },
    {
      status: 'Implementation',
      matched: stats?.implementation_facilities_in_dh || 0,
      unmatched: (stats?.implementation_facilities || 0) - (stats?.implementation_facilities_in_dh || 0),
    },
    {
      status: 'Stalled',
      matched: stats?.stalled_facilities_in_dh || 0,
      unmatched: (stats?.stalled_facilities || 0) - (stats?.stalled_facilities_in_dh || 0),
    },
    {
      status: 'Offboarding',
      matched: stats?.offboarding_facilities_in_dh || 0,
      unmatched: (stats?.offboarding_facilities || 0) - (stats?.offboarding_facilities_in_dh || 0),
    },
    {
      status: 'Churned',
      matched: stats?.churned_facilities_in_dh || 0,
      unmatched: (stats?.churned_facilities || 0) - (stats?.churned_facilities_in_dh || 0),
    },
  ].filter((d) => d.matched + d.unmatched > 0);

  const dataFreshness = stats?.data_loaded_at
    ? (() => {
        try {
          return new Date(stats.data_loaded_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
          });
        } catch {
          return null;
        }
      })()
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-covr-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center" role="alert" aria-live="assertive">
          <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-red-600 font-medium mb-3">{error}</p>
          <button onClick={fetchData} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-covr-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Covr Penetration Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Business Intelligence for Leadership
                  {dataFreshness && (
                    <span className="ml-2 text-gray-400">· Data as of {dataFreshness}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="btn-secondary text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="card border-l-4 border-l-covr-blue">
              <p className="text-sm text-gray-600 mb-1">Total Corporations</p>
              <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">
                {stats.total_corporations}
              </p>
            </div>
            <div className="card border-l-4 border-l-green-500">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
                {stats.active_status_count}
              </p>
            </div>
            <div className="card border-l-4 border-l-covr-blue">
              <p className="text-sm text-gray-600 mb-1">Avg Penetration</p>
              <p className="text-3xl font-bold text-covr-blue font-mono tabular-nums">
                {Math.round((stats.avg_penetration_rate || 0) * 100)}%
              </p>
            </div>
            <div className="card border-l-4 border-l-gray-400">
              <p className="text-sm text-gray-600 mb-1">Total Facilities</p>
              <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">
                {stats.total_facilities?.toLocaleString() || 0}
              </p>
            </div>
            <div className="card border-l-4 border-l-covr-teal">
              <p className="text-sm text-gray-600 mb-1">Definitive Healthcare</p>
              <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">
                {stats.total_facilities_in_dh?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-fira-sans)' }} />
                <YAxis tick={{ fontFamily: 'var(--font-fira-code)' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e40af">
                  <LabelList dataKey="count" position="top" style={{ fontFamily: 'var(--font-fira-code)', fontSize: 12, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Product Mix
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productMixData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Penetration Chart */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 10 Corporations by Penetration Rate
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={penetrationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'penetration') return [`${value}%`, 'Penetration'];
                  return [value, name];
                }}
              />
              <ReferenceLine x={80} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '80% target', position: 'top', fill: '#dc2626', fontSize: 11 }} />
              <Bar dataKey="penetration" fill="#059669" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Facilities by Corporation Status */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Facilities by Corporation Status
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Total facility count per status — showing Definitive Healthcare coverage vs. unmatched
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={facilitiesByStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name === 'matched' ? 'In Definitive Healthcare' : 'Not Matched',
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === 'matched' ? 'In Definitive Healthcare' : 'Not Matched'
                }
              />
              <Bar dataKey="matched" stackId="a" fill="#0d9488" />
              <Bar dataKey="unmatched" stackId="a" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Status
              </label>
              <select
                value={selectedTaskStatus}
                onChange={(e) => setSelectedTaskStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Task Statuses</option>
                <option value="Active">Active</option>
                <option value="Churned">Churned</option>
                <option value="Implementation">Implementation</option>
                <option value="Stalled">Stalled</option>
                <option value="Offboarding">Offboarding</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Products</option>
                <option value="Flow">Flow</option>
                <option value="View">View</option>
                <option value="Sync">Sync</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search corporations..."
                className="filter-select w-full"
              />
            </div>
          </div>
        </div>

        {/* Corporation Table */}
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Corporations ({filteredCorporations.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Corporation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Mix
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facilities
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Definitive Healthcare
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Penetration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCorporations.map((corp) => (
                  <tr key={corp.clickup_task_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {corp.corporation_name}
                      </div>
                      <div className="flex gap-3">
                        {corp.hubspot_url && (
                          <a
                            href={corp.hubspot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-covr-blue hover:underline"
                          >
                            View in HubSpot
                          </a>
                        )}
                        <a
                          href={`https://app.clickup.com/901302721443/v/li/901302721443/${corp.clickup_task_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:underline"
                        >
                          View in ClickUp
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${
                            corp.task_status_label === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : corp.task_status_label === 'Churned'
                              ? 'bg-red-100 text-red-800'
                              : corp.task_status_label === 'Implementation'
                              ? 'bg-blue-100 text-blue-800'
                              : corp.task_status_label === 'Stalled'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {corp.task_status_label}
                        </span>
                        {corp.customer_type_label && (
                          <span className="text-xs text-gray-500">
                            Type: {corp.customer_type_label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {corp.product_mix}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {corp.total_facilities?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {corp.facilities_in_dh?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (corp.penetration_rate || 0) >= 0.8
                                ? 'bg-green-500'
                                : (corp.penetration_rate || 0) >= 0.5
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                (corp.penetration_rate || 0) * 100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900 font-medium">
                          {Math.round((corp.penetration_rate || 0) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}