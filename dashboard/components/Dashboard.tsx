h'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
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
} from 'recharts';

interface Corporation {
  clickup_task_id: string;
  corporation_name: string;
  task_status: string;
  task_status_label: string;
  customer_type_label: string | null;
  hubspot_url: string | null;
  hubspot_company_id: string | null;
  total_child_facilities: number | null;
  facilities_with_clickup: number | null;
  penetration_rate: number | null;
  product_mix: string;
  associated_companies_count: number;
}

interface Stats {
  total_corporations: number;
  active_status_count: number;
  churned_status_count: number;
  implementation_status_count: number;
  stalled_status_count: number;
  offboarding_status_count: number;
  active_customer_type: number;
  churned_customer_type: number;
  no_start_customer_type: number;
  flow_customers: number;
  view_customers: number;
  sync_customers: number;
  avg_penetration_rate: number;
  total_facilities: number;
  total_active_facilities: number;
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
  const { data: session } = useSession();
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/corporations');
      if (response.ok) {
        const data = await response.json();
        setCorporations(data.corporations);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCorporations = corporations.filter((corp) => {
    const matchesCustomerType =
      selectedStatus === 'all' || corp.customer_type_label === selectedStatus;
    const matchesTaskStatus =
      selectedTaskStatus === 'all' || corp.task_status_label === selectedTaskStatus;
    const matchesProduct =
      selectedProduct === 'all' || corp.product_mix.includes(selectedProduct);
    const matchesSearch =
      searchQuery === '' ||
      corp.corporation_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCustomerType && matchesTaskStatus && matchesProduct && matchesSearch;
  });

  const productMixData = [
    { name: 'Flow', value: stats?.flow_customers || 0 },
    { name: 'View', value: stats?.view_customers || 0 },
    { name: 'Sync', value: stats?.sync_customers || 0 },
  ].filter((item) => item.value > 0);

  // Task Status Data (Primary corporation status)
  const taskStatusData = [
    { name: 'Active', count: stats?.active_status_count || 0 },
    { name: 'Churned', count: stats?.churned_status_count || 0 },
    { name: 'Implementation', count: stats?.implementation_status_count || 0 },
    { name: 'Stalled', count: stats?.stalled_status_count || 0 },
    { name: 'Offboarding', count: stats?.offboarding_status_count || 0 },
  ].filter((item) => item.count > 0);

  // Customer Type Data (Secondary classification)
  const customerTypeData = [
    { name: 'Active', count: stats?.active_customer_type || 0 },
    { name: 'Churned', count: stats?.churned_customer_type || 0 },
    { name: 'No Start', count: stats?.no_start_customer_type || 0 },
  ].filter((item) => item.count > 0);

  const penetrationData = filteredCorporations
    .slice(0, 10)
    .map((corp) => ({
      name: corp.corporation_name.substring(0, 20) + '...',
      penetration: Math.round((corp.penetration_rate || 0) * 100),
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-covr-blue"></div>
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
                  Cover Penetration Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Business Intelligence for Leadership
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <p className="text-sm text-gray-600 mb-1">Total Corporations</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_corporations}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 mb-1">Active (Task Status)</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.active_status_count}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 mb-1">Avg Penetration</p>
              <p className="text-3xl font-bold text-covr-blue">
                {Math.round(stats.avg_penetration_rate * 100)}%
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-600 mb-1">Total Facilities</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_facilities?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Task Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1e40af" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" />
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
                  {productMixData.map((entry, index) => (
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

        {/* Top Penetration Chart */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 10 Corporations by Penetration Rate
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={penetrationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="penetration" fill="#059669" />
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
                Customer Type
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Customer Types</option>
                <option value="Active">Active</option>
                <option value="Churned">Churned</option>
                <option value="No Start">No Start</option>
                <option value="Paused">Paused</option>
                <option value="Prospect">Prospect</option>
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
                      {corp.facilities_with_clickup || 0} /{' '}
                      {corp.total_child_facilities || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-covr-blue h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                (corp.penetration_rate || 0) * 100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">
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