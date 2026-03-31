'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';

// Raw row shape from the API (matches RepPerformanceRow in bigquery.ts)
interface ApiRow {
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
  _loaded_at: string;
}

// Aggregated per-rep shape used in the UI
interface RepData {
  ownerId: string;
  name: string;
  dealsClosed: number;
  pipelineValue: number;
  winRate: number;
  avgDealSize: number;
  activitiesLogged: number;
}

export default function RepPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState<RepData[]>([]);
  const [sortBy, setSortBy] = useState<keyof RepData>('dealsClosed');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rep-performance');
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const result = await response.json();
      const rows: ApiRow[] = result.data ?? [];

      // Aggregate monthly rows into per-rep totals
      const byOwner = new Map<string, RepData>();
      for (const row of rows) {
        const existing = byOwner.get(row.owner_id);
        if (existing) {
          existing.dealsClosed += row.deals_won;
          existing.pipelineValue += row.pipeline_won_amount;
          existing.activitiesLogged += row.deals_entered;
          // We'll recompute avgDealSize and winRate after aggregation
        } else {
          byOwner.set(row.owner_id, {
            ownerId: row.owner_id,
            name: row.owner_full_name || `Owner ${row.owner_id}`,
            dealsClosed: row.deals_won,
            pipelineValue: row.pipeline_won_amount,
            winRate: 0, // placeholder
            avgDealSize: 0, // placeholder
            activitiesLogged: row.deals_entered,
          });
        }
      }

      // Compute derived metrics
      const repList = Array.from(byOwner.values()).map((r) => ({
        ...r,
        avgDealSize: r.dealsClosed > 0 ? Math.round(r.pipelineValue / r.dealsClosed) : 0,
        // Win rate as percentage — approximate from totals (won / entered)
        winRate: r.activitiesLogged > 0
          ? Math.round((r.dealsClosed / r.activitiesLogged) * 100)
          : 0,
      }));

      setReps(repList);
    } catch (err) {
      console.error('Failed to fetch rep performance data:', err);
      setError('Failed to load rep performance data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mt-8">
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const sortedReps = [...reps].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const dir = sortDir === 'asc' ? 1 : -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const handleSort = (col: keyof RepData) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const sortIcon = (col: keyof RepData) =>
    sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  const totalDeals = reps.reduce((s, r) => s + r.dealsClosed, 0);
  const totalPipeline = reps.reduce((s, r) => s + r.pipelineValue, 0);
  const avgWinRate = reps.length > 0
    ? Math.round(reps.reduce((s, r) => s + r.winRate, 0) / reps.length)
    : 0;
  const topRep = reps.reduce((best, r) => r.dealsClosed > best.dealsClosed ? r : best, reps[0]);

  const maxDeals = Math.max(...reps.map((r) => r.dealsClosed), 1);
  const maxActivities = Math.max(...reps.map((r) => r.activitiesLogged), 1);
  const maxAvgSize = Math.max(...reps.map((r) => r.avgDealSize), 1);

  const radarData = reps.map((r) => ({
    name: r.name,
    deals: Math.round((r.dealsClosed / maxDeals) * 100),
    winRate: r.winRate,
    activities: Math.round((r.activitiesLogged / maxActivities) * 100),
    avgSize: Math.round((r.avgDealSize / maxAvgSize) * 100),
  }));

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Rep Performance</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Individual sales rep metrics and comparative analytics
        </p>
      </div>

      {reps.length === 0 ? (
        <div className="card mt-8">
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No rep performance data available yet. Data will appear once deals are synced from HubSpot.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-glow">
              <p className="text-[11px] uppercase tracking-widest mb-2">Total Deals Closed</p>
              <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">{totalDeals}</p>
            </div>
            <div className="card-glow" style={{ borderTopColor: "#3B7E6B" }}>
              <p className="text-[11px] uppercase tracking-widest mb-2">Total Pipeline Won</p>
              <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
                ${(totalPipeline / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="card-glow" style={{ borderTopColor: "#26A2DC" }}>
              <p className="text-[11px] uppercase tracking-widest mb-2">Avg Win Rate</p>
              <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">{avgWinRate}%</p>
            </div>
            <div className="card-glow" style={{ borderTopColor: "#A67FB9" }}>
              <p className="text-[11px] uppercase tracking-widest mb-2">Top Performer</p>
              <p className="text-2xl font-bold text-purple-600">{topRep?.name ?? '—'}</p>
              <p className="text-[11px] mt-1.5">{topRep?.dealsClosed ?? 0} deals closed</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold mb-1">Deals Closed by Rep</h3>
              <p className="text-sm mb-4">Number of deals closed per sales representative</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reps} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis type="number" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="dealsClosed" name="Deals" fill="#1570B6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-1">Performance Radar</h3>
              <p className="text-sm mb-4">Normalized score (0-100) across key metrics</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontFamily: 'var(--font-primary-sans)', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Deals" dataKey="deals" stroke="#1570B6" fill="#1570B6" fillOpacity={0.2} />
                  <Radar name="Win Rate" dataKey="winRate" stroke="#3B7E6B" fill="#3B7E6B" fillOpacity={0.15} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rep Table */}
          <div className="card overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">
              Rep Details ({reps.length} reps)
            </h3>
            <div className="overflow-x-auto">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')}>
                      Rep{sortIcon('name')}
                    </th>
                    <th style={{ textAlign: "right" }} onClick={() => handleSort('dealsClosed')}>
                      Deals{sortIcon('dealsClosed')}
                    </th>
                    <th style={{ textAlign: "right" }} onClick={() => handleSort('pipelineValue')}>
                      Pipeline Won{sortIcon('pipelineValue')}
                    </th>
                    <th style={{ textAlign: "right" }} onClick={() => handleSort('winRate')}>
                      Win Rate{sortIcon('winRate')}
                    </th>
                    <th style={{ textAlign: "right" }} onClick={() => handleSort('avgDealSize')}>
                      Avg Deal{sortIcon('avgDealSize')}
                    </th>
                    <th style={{ textAlign: "right" }} onClick={() => handleSort('activitiesLogged')}>
                      Deals Entered{sortIcon('activitiesLogged')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReps.map((rep) => (
                    <tr key={rep.ownerId}>
                      <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {rep.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                        {rep.dealsClosed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                        ${(rep.pipelineValue / 1000).toFixed(0)}K
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
                        ${rep.avgDealSize.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                        {rep.activitiesLogged}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
