'use client';

import { useEffect, useState, useMemo } from 'react';
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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { DateRangePicker, SalesRepFilter } from './filters';
import type { DateRange, SalesRepFilterValue } from './filters';
import TimelineSelector, { TimelinePeriod } from './TimelineSelector';
import {
  filterCorporationsByTimeline,
  recalculateStatsFromCorporations,
  getTimelineLabel,
  Corporation as TimelineCorporation,
  Stats as TimelineStats,
} from '@/lib/timeline-utils';

interface Corporation extends TimelineCorporation {
  // Inherits all fields from timeline-utils
}

interface Stats extends TimelineStats {
  // Inherits all fields from timeline-utils
}

interface DashboardProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const COLORS = ['#1e40af', '#0d9488', '#059669', '#7c3aed', '#dc2626'];

const STATUS_COLORS: Record<string, string> = {
  Active: '#059669',
  Churned: '#dc2626',
  Implementation: '#1e40af',
  Stalled: '#d97706',
  Offboarding: '#64748b',
};

export default function Dashboard({ user }: DashboardProps) {
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [salesRepFilter, setSalesRepFilter] = useState<SalesRepFilterValue>({ reps: [], groups: [] });
  const [sortColumn, setSortColumn] = useState<
    'corporation_name' | 'task_status_label' | 'product_mix' | 'total_facilities' | 'facilities_in_dh' | 'penetration_rate'
  >('penetration_rate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [timeline, setTimeline] = useState<TimelinePeriod>('all');
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const handleTimelineChange = (period: TimelinePeriod) => {
    setIsTransitioning(true);
    setTimeline(period);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection(col === 'corporation_name' || col === 'task_status_label' || col === 'product_mix' ? 'asc' : 'desc');
    }
  };

  // Apply timeline filter to all corporations
  const timelineFilteredCorporations = useMemo(() => {
    return filterCorporationsByTimeline(corporations, timeline);
  }, [corporations, timeline]);

  // Recalculate stats based on timeline-filtered corporations
  const timelineFilteredStats = useMemo(() => {
    if (!stats) return null;
    return recalculateStatsFromCorporations(timelineFilteredCorporations, stats);
  }, [timelineFilteredCorporations, stats]);

  // Apply UI filters (status, product, search) on top of timeline filter
  const filteredCorporations = timelineFilteredCorporations.filter((corp) => {
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
    { name: 'Flow', value: timelineFilteredStats?.flow_customers || 0 },
    { name: 'View', value: timelineFilteredStats?.view_customers || 0 },
    { name: 'Sync', value: timelineFilteredStats?.sync_customers || 0 },
  ].filter((item) => item.value > 0);

  // Customer Status Data (from ClickUp task status)
  const taskStatusData = [
    { name: 'Active', count: timelineFilteredStats?.active_status_count || 0 },
    { name: 'Churned', count: timelineFilteredStats?.churned_status_count || 0 },
    { name: 'Implementation', count: timelineFilteredStats?.implementation_status_count || 0 },
    { name: 'Stalled', count: timelineFilteredStats?.stalled_status_count || 0 },
    { name: 'Offboarding', count: timelineFilteredStats?.offboarding_status_count || 0 },
  ].filter((item) => item.count > 0);

  // GTM priority: lowest-penetration active + implementation accounts (uses timeline-filtered corps)
  const penetrationData = timelineFilteredCorporations
    .filter((c) => c.task_status_label === 'Active' || c.task_status_label === 'Implementation')
    .sort((a, b) => (a.penetration_rate || 0) - (b.penetration_rate || 0))
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
      matched: timelineFilteredStats?.active_facilities_in_dh || 0,
      unmatched: (timelineFilteredStats?.active_facilities || 0) - (timelineFilteredStats?.active_facilities_in_dh || 0),
    },
    {
      status: 'Implementation',
      matched: timelineFilteredStats?.implementation_facilities_in_dh || 0,
      unmatched: (timelineFilteredStats?.implementation_facilities || 0) - (timelineFilteredStats?.implementation_facilities_in_dh || 0),
    },
    {
      status: 'Stalled',
      matched: timelineFilteredStats?.stalled_facilities_in_dh || 0,
      unmatched: (timelineFilteredStats?.stalled_facilities || 0) - (timelineFilteredStats?.stalled_facilities_in_dh || 0),
    },
    {
      status: 'Offboarding',
      matched: timelineFilteredStats?.offboarding_facilities_in_dh || 0,
      unmatched: (timelineFilteredStats?.offboarding_facilities || 0) - (timelineFilteredStats?.offboarding_facilities_in_dh || 0),
    },
    {
      status: 'Churned',
      matched: timelineFilteredStats?.churned_facilities_in_dh || 0,
      unmatched: (timelineFilteredStats?.churned_facilities || 0) - (timelineFilteredStats?.churned_facilities_in_dh || 0),
    },
  ].filter((d) => d.matched + d.unmatched > 0);

  const weightedPenetration =
    timelineFilteredStats && timelineFilteredStats.total_facilities > 0
      ? Math.round((timelineFilteredStats.total_facilities_in_dh / timelineFilteredStats.total_facilities) * 100)
      : 0;

  // GTM tier metrics — scoped to Active accounts only, affected by timeline filter
  const activeCorps = timelineFilteredCorporations.filter((c) => c.task_status_label === 'Active');
  const tierBelow50 = activeCorps.filter((c) => (c.penetration_rate || 0) < 0.5);
  const tierMid = activeCorps.filter((c) => (c.penetration_rate || 0) >= 0.5 && (c.penetration_rate || 0) < 0.8);
  const tierAbove80 = activeCorps.filter((c) => (c.penetration_rate || 0) >= 0.8);
  const facilitiesBelow50 = tierBelow50.reduce((s, c) => s + (c.total_facilities || 0), 0);
  const facilitiesMid = tierMid.reduce((s, c) => s + (c.total_facilities || 0), 0);
  const facilitiesAbove80 = tierAbove80.reduce((s, c) => s + (c.total_facilities || 0), 0);
  const expansionOpportunity = activeCorps.reduce((sum, corp) => {
    const target = Math.floor((corp.total_facilities || 0) * 0.8);
    return sum + Math.max(0, target - (corp.facilities_in_dh || 0));
  }, 0);

  // Product depth vs. penetration — does more products → higher wallet share?
  const productDepthData = [1, 2, 3]
    .map((count) => {
      const corps = activeCorps.filter((c) => {
        const n =
          (c.product_mix.includes('Flow') ? 1 : 0) +
          (c.product_mix.includes('View') ? 1 : 0) +
          (c.product_mix.includes('Sync') ? 1 : 0);
        return n === count;
      });
      const avg =
        corps.length > 0
          ? corps.reduce((s, c) => s + (c.penetration_rate || 0), 0) / corps.length
          : 0;
      return {
        products: count === 1 ? '1 Product' : count === 2 ? '2 Products' : '3 Products',
        penetration: Math.round(avg * 100),
        count: corps.length,
      };
    })
    .filter((d) => d.count > 0);

  const scatterData = filteredCorporations.map((corp) => ({
    name: corp.corporation_name,
    won: corp.facilities_in_dh || 0,
    remaining: Math.max(0, (corp.total_facilities || 0) - (corp.facilities_in_dh || 0)),
    total: corp.total_facilities || 0,
    status: corp.task_status_label,
  }));

  const wonMedian = (() => {
    const vals = scatterData.map((d) => d.won).sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)] ?? 0;
  })();

  const remainingMedian = (() => {
    const vals = scatterData.map((d) => d.remaining).sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)] ?? 0;
  })();

  const sortedCorporations = [...filteredCorporations].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    const dir = sortDirection === 'asc' ? 1 : -1;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const sortIcon = (col: typeof sortColumn) =>
    sortColumn === col ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  const dataFreshness = timelineFilteredStats?.data_loaded_at
    ? (() => {
      try {
        return new Date(timelineFilteredStats.data_loaded_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
        });
      } catch {
        return null;
      }
    })()
    : null;

  const timelineLabel = getTimelineLabel(timeline);

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
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Corporation penetration metrics and status distribution
            {dataFreshness && (
              <span className="ml-2 text-gray-400">· Data as of {dataFreshness}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="btn-secondary text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Summary Cards */}
        {timelineFilteredStats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="card border-l-4 border-l-covr-blue">
              <p className="text-sm text-gray-600 mb-1">Total Corporations</p>
              <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">
                {timelineFilteredStats.total_corporations}
              </p>
            </div>
            <div className="card border-l-4 border-l-green-500">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
                {timelineFilteredStats.active_status_count}
              </p>
            </div>
            <div className="card border-l-4 border-l-covr-blue">
              <p className="text-sm text-gray-600 mb-1">Weighted Penetration</p>
              <p className="text-3xl font-bold text-covr-blue font-mono tabular-nums">
                {weightedPenetration}%
              </p>
              <p className="text-xs text-gray-400 mt-1">by facility count</p>
            </div>
            <div className="card border-l-4 border-l-gray-400">
              <p className="text-sm text-gray-600 mb-1">Total Facilities</p>
              <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">
                {timelineFilteredStats.total_facilities?.toLocaleString() || 0}
              </p>
            </div>
            <div className="card border-l-4 border-l-covr-teal">
              <p className="text-sm text-gray-600 mb-1">Definitive Healthcare</p>
              <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">
                {timelineFilteredStats.total_facilities_in_dh?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        )}

        {/* GTM Penetration Tiers — Active accounts only */}
        {timelineFilteredCorporations.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-l-red-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Below 50% — Active</p>
              <p className="text-2xl font-bold text-red-600 font-mono tabular-nums">
                {tierBelow50.length}<span className="text-sm font-normal text-gray-400 ml-1">corps</span>
              </p>
              <p className="text-sm text-gray-500 font-mono mt-1">{facilitiesBelow50.toLocaleString()} facilities</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-l-amber-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">50–79% — Active</p>
              <p className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
                {tierMid.length}<span className="text-sm font-normal text-gray-400 ml-1">corps</span>
              </p>
              <p className="text-sm text-gray-500 font-mono mt-1">{facilitiesMid.toLocaleString()} facilities</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-l-green-500">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">≥ 80% — Active</p>
              <p className="text-2xl font-bold text-green-600 font-mono tabular-nums">
                {tierAbove80.length}<span className="text-sm font-normal text-gray-400 ml-1">corps</span>
              </p>
              <p className="text-sm text-gray-500 font-mono mt-1">{facilitiesAbove80.toLocaleString()} facilities</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-l-orange-400">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Expansion to 80%</p>
              <p className="text-2xl font-bold text-orange-600 font-mono tabular-nums">
                {expansionOpportunity.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">facilities gap in active accounts</p>
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

        {/* Product Depth vs. Penetration */}
        {productDepthData.length > 0 && (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Product Depth vs. Facility Penetration
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Average facility penetration rate by number of Covr products — Active accounts only. Tests whether broader product adoption correlates with deeper wallet share.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productDepthData} barSize={80}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="products" tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 13 }} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Avg Penetration']}
                  content={(props) => {
                    if (!props.active || !props.payload?.length) return null;
                    const d = props.payload[0].payload as { products: string; penetration: number; count: number };
                    return (
                      <div className="bg-white border border-gray-200 rounded shadow-lg p-3 text-sm">
                        <p className="font-semibold text-gray-900 mb-1">{d.products}</p>
                        <p className="text-gray-600">Avg penetration: <span className="font-mono font-medium">{d.penetration}%</span></p>
                        <p className="text-gray-500 text-xs mt-1">{d.count} active accounts</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '80% target', position: 'right', fill: '#dc2626', fontSize: 11 }} />
                <Bar dataKey="penetration" fill="#1e40af" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="penetration"
                    position="top"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontFamily: 'var(--font-fira-code)', fontSize: 13, fill: '#374151', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Penetration Chart */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            GTM Priority — Lowest Penetration (Active &amp; In Implementation)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Accounts furthest from the 80% target — shows active/implementation corps for selected timeline
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={penetrationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" width={160} tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'penetration') return [`${value}%`, 'Penetration'];
                  return [value, name];
                }}
              />
              <ReferenceLine x={80} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '80% target', position: 'top', fill: '#dc2626', fontSize: 11 }} />
              <Bar dataKey="penetration">
                {penetrationData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.penetration >= 80 ? '#059669' : entry.penetration >= 50 ? '#d97706' : '#dc2626'}
                  />
                ))}
              </Bar>
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

        {/* Opportunity Matrix */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Opportunity Matrix
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Each dot is a corporation, sized by total facilities. Dashed lines show medians. &nbsp;
            <span className="text-gray-400">Top-right: large accounts with upside · Bottom-right: mature/saturated · Top-left: growth targets · Bottom-left: small accounts</span>
          </p>
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 20, right: 80, bottom: 50, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="won"
                name="Facilities Won"
                label={{ value: 'Facilities Won (Customers)', position: 'insideBottom', offset: -15, style: { fill: '#6b7280', fontSize: 12 } }}
                tickFormatter={(v: number) => v.toLocaleString()}
                tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="remaining"
                name="Facilities Remaining"
                label={{ value: 'Facilities Not Yet Won', angle: -90, position: 'insideLeft', offset: 15, style: { fill: '#6b7280', fontSize: 12 } }}
                tickFormatter={(v: number) => v.toLocaleString()}
                tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="total" range={[40, 500]} name="Total Facilities" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={(props) => {
                  if (!props.active || !props.payload?.length) return null;
                  const d = props.payload[0].payload as {
                    name: string; won: number; remaining: number; total: number; status: string;
                  };
                  return (
                    <div className="bg-white border border-gray-200 rounded shadow-lg p-3 text-sm max-w-xs">
                      <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
                      <p className="text-gray-600">Won: <span className="font-mono font-medium">{d.won.toLocaleString()}</span></p>
                      <p className="text-gray-600">Remaining: <span className="font-mono font-medium">{d.remaining.toLocaleString()}</span></p>
                      <p className="text-gray-600">Total: <span className="font-mono font-medium">{d.total.toLocaleString()}</span></p>
                      <p className="text-xs text-gray-400 mt-1">{d.status}</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                x={wonMedian}
                stroke="#9ca3af"
                strokeDasharray="5 3"
                label={{ value: `median (${wonMedian.toLocaleString()})`, position: 'top', fontSize: 10, fill: '#9ca3af' }}
              />
              <ReferenceLine
                y={remainingMedian}
                stroke="#9ca3af"
                strokeDasharray="5 3"
                label={{ value: `median (${remainingMedian.toLocaleString()})`, position: 'insideBottomRight', fontSize: 10, fill: '#9ca3af' }}
              />
              <Scatter data={scatterData} fillOpacity={0.75}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 justify-center">
            {Object.entries(STATUS_COLORS).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
            <SalesRepFilter
              value={salesRepFilter}
              onChange={setSalesRepFilter}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Status
              </label>
              <select
                value={selectedTaskStatus}
                onChange={(e) => setSelectedTaskStatus(e.target.value)}
                className="filter-select w-full"
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
                className="filter-select w-full"
              >
                <option value="all">All Products</option>
                <option value="Flow">Flow</option>
                <option value="View">View</option>
                <option value="Sync">Sync</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
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
            {(dateRange || salesRepFilter.reps.length > 0 || salesRepFilter.groups.length > 0) && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setDateRange(null);
                    setSalesRepFilter({ reps: [], groups: [] });
                    setSelectedTaskStatus('all');
                    setSelectedProduct('all');
                    setSearchQuery('');
                    setTimeline('all');
                  }}
                  className="btn-secondary text-xs py-2"
                >
                  Reset All Filters
                </button>
              </div>
            )}
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('corporation_name')}
                  >
                    Corporation{sortIcon('corporation_name')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('task_status_label')}
                  >
                    Status{sortIcon('task_status_label')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('product_mix')}
                  >
                    Product Mix{sortIcon('product_mix')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('total_facilities')}
                  >
                    Facilities{sortIcon('total_facilities')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('facilities_in_dh')}
                  >
                    Definitive Healthcare{sortIcon('facilities_in_dh')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('penetration_rate')}
                  >
                    Penetration{sortIcon('penetration_rate')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCorporations.map((corp) => (
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
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${corp.task_status_label === 'Active'
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
                            className={`h-2 rounded-full ${(corp.penetration_rate || 0) >= 0.8
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
      </div>
    </div>
  );
}