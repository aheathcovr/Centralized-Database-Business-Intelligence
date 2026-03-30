'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts';

interface RepRow {
  month_start: string;
  month_label: string;
  owner_id: string;
  owner_full_name: string;
  deals_won: number;
  deals_lost: number;
  deals_entered: number;
  pipeline_won_amount: number;
  pipeline_entered_amount: number;
  avg_deal_size: number;
  win_rate_pct: number | null;
  close_rate_pct: number | null;
}

interface RepSummary {
  name: string;
  ownerId: string;
  totalWon: number;
  totalLost: number;
  totalEntered: number;
  totalPipelineWon: number;
  totalPipelineEntered: number;
  winRate: number;
  avgDealSize: number;
}

export default function RepPerformancePage() {
  const [data, setData] = useState<RepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof RepSummary>('totalWon');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rep-performance');
      if (!response.ok) throw new Error('Request failed: ' + response.status);
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Failed to fetch rep performance:', err);
      setError('Failed to load rep performance data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate rows by owner across all months
  const repSummaries = useMemo(() => {
    const byOwner = new Map<string, RepSummary>();
    for (const row of data) {
      const existing = byOwner.get(row.owner_id);
      if (existing) {
        existing.totalWon += row.deals_won;
        existing.totalLost += row.deals_lost;
        existing.totalEntered += row.deals_entered;
        existing.totalPipelineWon += row.pipeline_won_amount;
        existing.totalPipelineEntered += row.pipeline_entered_amount;
      } else {
        byOwner.set(row.owner_id, {
          name: row.owner_full_name || 'Unknown Rep',
          ownerId: row.owner_id,
          totalWon: row.deals_won,
          totalLost: row.deals_lost,
          totalEntered: row.deals_entered,
          totalPipelineWon: row.pipeline_won_amount,
          totalPipelineEntered: row.pipeline_entered_amount,
          winRate: 0,
          avgDealSize: 0,
        });
      }
    }
    // Calculate derived metrics
    const summaries = Array.from(byOwner.values()).map((s) => ({
      ...s,
      winRate: s.totalWon + s.totalLost > 0
        ? Math.round((s.totalWon / (s.totalWon + s.totalLost)) * 100)
        : 0,
      avgDealSize: s.totalWon > 0
        ? Math.round(s.totalPipelineWon / s.totalWon)
        : 0,
    }));
    return summaries;
  }, [data]);

  // Sorted reps for the table
  const sortedReps = useMemo(() => {
    return [...repSummaries].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const dir = sortDir === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }, [repSummaries, sortBy, sortDir]);

  const handleSort = (col: keyof RepSummary) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const sortIcon = (col: keyof RepSummary) =>
    sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  // Monthly chart: deals won by rep per month
  const months = useMemo(() => {
    const set = new Set(data.map((d) => d.month_label));
    return Array.from(set);
  }, [data]);

  const monthlyChartData = useMemo(() => {
    return months.map((m) => {
      const monthRows = data.filter((d) => d.month_label === m);
      const point: Record<string, unknown> = { month: m };
      for (const row of monthRows) {
        const key = row.owner_full_name || 'Unknown';
        point[key] = row.deals_won;
      }
      return point;
    });
  }, [data, months]);

  const repNames = useMemo(() => {
    const set = new Set(data.map((d) => d.owner_full_name || 'Unknown'));
    return Array.from(set);
  }, [data]);

  const barColors = ['#1e40af', '#059669', '#7c3aed', '#dc2626', '#d97706', '#0d9488', '#64748b'];

  // Summary totals
  const totalWon = repSummaries.reduce((s, r) => s + r.totalWon, 0);
  const totalLost = repSummaries.reduce((s, r) => s + r.totalLost, 0);
  const totalPipelineWon = repSummaries.reduce((s, r) => s + r.totalPipelineWon, 0);
  const avgWinRate = repSummaries.length > 0
    ? Math.round(repSummaries.reduce((s, r) => s + r.winRate, 0) / repSummaries.length)
    : 0;
  const topRep = repSummaries.reduce<RepSummary | null>((best, r) => {
    if (!best || r.totalWon > best.totalWon) return r;
    return best;
  }, null);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-covr-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Rep Performance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Individual sales rep metrics from HubSpot deal data
        </p>
      </div>

      {error && (
        <div className="card mb-6 border-l-4 border-l-red-500">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card border-l-4 border-l-covr-blue">
          <p className="text-sm text-gray-600 mb-1">Total Deals Won</p>
          <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">{totalWon}</p>
          <p className="text-xs text-gray-400 mt-1">vs {totalLost} lost</p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="text-sm text-gray-600 mb-1">Total Pipeline Won</p>
          <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
            ${(totalPipelineWon / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="card border-l-4 border-l-covr-teal">
          <p className="text-sm text-gray-600 mb-1">Avg Win Rate</p>
          <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">{avgWinRate}%</p>
        </div>
        <div className="card border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-600 mb-1">Top Performer</p>
          <p className="text-2xl font-bold text-purple-600">{topRep?.name || '—'}</p>
          {topRep && <p className="text-xs text-gray-400 mt-1">{topRep.totalWon} deals won</p>}
        </div>
      </div>

      {/* Monthly Deals Won Chart */}
      {monthlyChartData.length > 0 && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Monthly Deals Won by Rep</h3>
          <p className="text-sm text-gray-500 mb-4">
            Deals closed won each month, broken down by sales representative
          </p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 12 }} />
              <YAxis tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontFamily: 'var(--font-fira-sans)', fontSize: 13 }} />
              <Legend formatter={(value) => <span className="text-sm text-gray-700">{value}</span>} />
              {repNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  fill={barColors[i % barColors.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Win Rate Chart */}
      {monthlyChartData.length > 0 && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Win Rate Trend by Rep</h3>
          <p className="text-sm text-gray-500 mb-4">
            Monthly win rate percentage per rep (won / won + lost)
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={months.map((m) => {
              const monthRows = data.filter((d) => d.month_label === m);
              const point: Record<string, unknown> = { month: m };
              for (const row of monthRows) {
                const key = row.owner_full_name || 'Unknown';
                point[key] = row.win_rate_pct != null ? Math.round(row.win_rate_pct * 100) : null;
              }
              return point;
            })}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => v + '%'} tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }} />
              <Tooltip formatter={(value: unknown) => [value != null ? value + '%' : 'N/A', '']} />
              <Legend formatter={(value) => <span className="text-sm text-gray-700">{value}</span>} />
              {repNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={barColors[i % barColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* No Data */}
      {data.length === 0 && !loading && !error && (
        <div className="card">
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-700 mb-1">No Rep Data Available</h3>
            <p className="text-xs text-gray-400">
              The rep_performance_view may not yet be deployed in BigQuery.
              See bigquery/rep_performance_view.sql to create it.
            </p>
          </div>
        </div>
      )}

      {/* Rep Table */}
      {repSummaries.length > 0 && (
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rep Details ({sortedReps.length} reps)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('name')}>
                    Rep{sortIcon('name')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('totalWon')}>
                    Won{sortIcon('totalWon')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('totalLost')}>
                    Lost{sortIcon('totalLost')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('winRate')}>
                    Win Rate{sortIcon('winRate')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('totalPipelineWon')}>
                    Pipeline Won{sortIcon('totalPipelineWon')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('avgDealSize')}>
                    Avg Deal{sortIcon('avgDealSize')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('totalEntered')}>
                    Entered{sortIcon('totalEntered')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedReps.map((rep) => (
                  <tr key={rep.ownerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rep.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-mono tabular-nums">
                      {rep.totalWon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-mono tabular-nums">
                      {rep.totalLost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rep.winRate >= 35 ? 'bg-green-100 text-green-800' :
                        rep.winRate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rep.winRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                      ${(rep.totalPipelineWon / 1000).toFixed(0)}K
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                      ${rep.avgDealSize.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                      {rep.totalEntered}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Methodology */}
      <div className="card mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Methodology</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <strong>Win Rate</strong> = Deals Won / (Deals Won + Deals Lost) — excludes pushed/no-change deals.</li>
          <li>• <strong>Deals Entered</strong> = deals created in each month (activity proxy).</li>
          <li>• <strong>Deals Won/Lost</strong> = deals that transitioned to closedwon/closedlost in each month.</li>
          <li>• Source: HubSpot deal data via <code>revops_analytics.rep_performance_view</code>.</li>
        </ul>
      </div>
    </div>
  );
}
