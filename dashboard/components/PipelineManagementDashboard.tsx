'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@/lib/hooks';
import { sortData } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import KpiCard from '@/components/KpiCard';

interface PipelineMetricsRow {
  group_mode: string;
  group_label: string;
  group_key: string;
  display_name: string;
  trailing_window: string;
  total_deals: number;
  deals_won: number;
  deals_lost: number;
  deals_open: number;
  total_won_amount: number;
  total_pipeline_amount: number;
  close_rate_pct: number | null;
  asp: number | null;
  avg_sales_cycle_days: number | null;
  pipeline_velocity_30d: number | null;
}

type GroupMode = 'by_rep' | 'by_create_month' | 'by_create_quarter';
type TrailingWindow = '30d' | '90d' | '180d' | 'all';

const TRAILING_WINDOWS: { value: TrailingWindow; label: string }[] = [
  { value: '30d', label: 'Trailing 30 Days' },
  { value: '90d', label: 'Trailing 90 Days' },
  { value: '180d', label: 'Trailing 180 Days' },
  { value: 'all', label: 'All Time' },
];

const GROUP_MODES: { value: GroupMode; label: string }[] = [
  { value: 'by_rep', label: 'By Sales Rep' },
  { value: 'by_create_month', label: 'By Create Month' },
  { value: 'by_create_quarter', label: 'By Create Quarter' },
];

const DEFAULT_SELECTED_REPS = ['Charles', 'Logan', 'Bradi'];

const CHART_COLORS = ['#22d3ee', '#0891b2', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];

export default function PipelineManagementDashboard() {
  const [trailingWindow, setTrailingWindow] = useState<TrailingWindow>('90d');
  const [groupMode, setGroupMode] = useState<GroupMode>('by_rep');
  const [selectedReps, setSelectedReps] = useState<string[]>(DEFAULT_SELECTED_REPS);

  const { data, loading, error, refetch: fetchAllData } = useQuery<{ data: PipelineMetricsRow[] }>(
    'pipeline-metrics',
    async () => {
      const response = await fetch('/api/pipeline-metrics');
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    }
  );

  const allData = data?.data || [];

  const availableReps = useMemo(() => {
    const repRows = allData.filter((row) => row.group_mode === 'by_rep' && row.trailing_window === trailingWindow);
    return repRows.map((row) => row.display_name).sort();
  }, [allData, trailingWindow]);

  const [repsInitialized, setRepsInitialized] = useState(false);
  useEffect(() => {
    if (!repsInitialized && availableReps.length > 0) {
      const matched = availableReps.filter((rep) =>
        DEFAULT_SELECTED_REPS.some((defaultRep) =>
          rep.toLowerCase().includes(defaultRep.toLowerCase())
        )
      );
      if (matched.length > 0) {
        setSelectedReps(matched);
      } else {
        setSelectedReps(availableReps);
      }
      setRepsInitialized(true);
    }
  }, [availableReps, repsInitialized]);

  const toggleRep = (rep: string) => {
    setSelectedReps((prev) =>
      prev.includes(rep) ? prev.filter((r) => r !== rep) : [...prev, rep]
    );
  };

  const selectAllReps = () => setSelectedReps(availableReps);
  const clearAllReps = () => setSelectedReps([]);

  const filteredData = useMemo(() => {
    // js-combine-iterations: Combine multiple filter conditions into one loop
    return allData.filter((row) => {
      if (row.group_mode !== groupMode || row.trailing_window !== trailingWindow) return false;
      if (groupMode === 'by_rep' && selectedReps.length > 0) {
        return selectedReps.includes(row.display_name);
      }
      return true;
    });
  }, [allData, groupMode, trailingWindow, selectedReps]);

  const aggregateKpis = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgCloseRate: null as number | null,
        avgAsp: null as number | null,
        avgSalesCycle: null as number | null,
        avgVelocity: null as number | null,
        totalDeals: 0,
        totalWon: 0,
        totalWonAmount: 0,
      };
    }
    
    // js-combine-iterations: Calculate all aggregates in a single pass instead of 5 separate reduces
    let totalDeals = 0;
    let totalWon = 0;
    let totalWonAmount = 0;
    let totalSalesCycleDays = 0;
    let totalVelocity = 0;

    for (const r of filteredData) {
      totalDeals += r.total_deals;
      totalWon += r.deals_won;
      totalWonAmount += r.total_won_amount;
      if (r.avg_sales_cycle_days != null) totalSalesCycleDays += r.avg_sales_cycle_days * r.deals_won;
      totalVelocity += r.pipeline_velocity_30d ?? 0;
    }

    const avgCloseRate = totalDeals > 0 ? totalWon / totalDeals : null;
    const avgAsp = totalWon > 0 ? totalWonAmount / totalWon : null;
    const avgSalesCycle = totalWon > 0 ? totalSalesCycleDays / totalWon : null;
    const avgVelocity = totalVelocity / filteredData.length;
    
    return {
      avgCloseRate,
      avgAsp,
      avgSalesCycle,
      avgVelocity: avgVelocity > 0 ? avgVelocity : null,
      totalDeals,
      totalWon,
      totalWonAmount,
    };
  }, [filteredData]);

  type ChartDataRow = {
    name: string;
    closeRate: number;
    asp: number;
    salesCycle: number;
    velocity: number;
    dealsWon: number;
    totalDeals: number;
  };

  const chartData = useMemo<ChartDataRow[]>(() => {
    return filteredData.map((row) => ({
      name: row.display_name,
      closeRate: row.close_rate_pct != null ? Math.round(row.close_rate_pct * 100) : 0,
      asp: row.asp != null ? Math.round(row.asp) : 0,
      salesCycle: row.avg_sales_cycle_days != null ? Math.round(row.avg_sales_cycle_days) : 0,
      velocity: row.pipeline_velocity_30d != null ? Math.round(row.pipeline_velocity_30d) : 0,
      dealsWon: row.deals_won,
      totalDeals: row.total_deals,
    }));
  }, [filteredData]);

  const [sortCol, setSortCol] = useState<keyof PipelineMetricsRow>('display_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: keyof PipelineMetricsRow) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortIcon = (col: keyof PipelineMetricsRow) =>
    sortCol === col ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ' \u2195';

  const sortedData = useMemo(() => {
    return sortData(filteredData, sortCol, sortDir);
  }, [filteredData, sortCol, sortDir]);

  const formatCurrency = (val: number | null) => {
    if (val == null) return 'N/A';
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  const formatPct = (val: number | null) => {
    if (val == null) return 'N/A';
    return `${Math.round(val * 100)}%`;
  };

  const formatDays = (val: number | null) => {
    if (val == null) return 'N/A';
    return `${Math.round(val)} days`;
  };

  if (loading && allData.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center" role="alert" aria-live="assertive">
          <p className="text-[#ef4444] font-medium mb-3">{error instanceof Error ? error.message : String(error)}</p>
          <button onClick={fetchAllData} className="btn-primary text-sm" disabled={loading}>
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Pipeline Management</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Sales pipeline metrics: close rate, ASP, sales cycle, and pipeline velocity
        </p>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Time Window
            </label>
            <div className="flex gap-1 flex-wrap">
              {TRAILING_WINDOWS.map((tw) => (
                <button
                  key={tw.value}
                  onClick={() => setTrailingWindow(tw.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer ${trailingWindow === tw.value
                      ? 'bg-accent text-canvas font-semibold shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'bg-elevated text-text-secondary hover:bg-card-hover hover:text-text-primary border border-[var(--border-subtle)]'
                    }`}
                >
                  {tw.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Group By
            </label>
            <div className="flex gap-1 flex-wrap">
              {GROUP_MODES.map((gm) => (
                <button
                  key={gm.value}
                  onClick={() => setGroupMode(gm.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer ${groupMode === gm.value
                      ? 'bg-accent text-canvas font-semibold shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'bg-elevated text-text-secondary hover:bg-card-hover hover:text-text-primary border border-[var(--border-subtle)]'
                    }`}
                >
                  {gm.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {groupMode === 'by_rep' && availableReps.length > 0 ? (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color, rgba(148,163,184,0.15))' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Sales Reps
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllReps}
                  className="text-[10px] font-medium uppercase tracking-wider cursor-pointer hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <button
                  onClick={clearAllReps}
                  className="text-[10px] font-medium uppercase tracking-wider cursor-pointer hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {availableReps.map((rep) => (
                <button
                  key={rep}
                  onClick={() => toggleRep(rep)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer ${selectedReps.includes(rep)
                      ? 'bg-accent text-canvas font-semibold shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'bg-elevated text-text-secondary hover:bg-card-hover hover:text-text-primary border border-[var(--border-subtle)]'
                    }`}
                >
                  {rep}
                </button>
              ))}
            </div>
            {selectedReps.length === 0 ? (
              <p className="text-xs text-amber-500 mt-2">
                No reps selected. Select at least one rep to view metrics.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KpiCard
          label="Close Rate"
          value={formatPct(aggregateKpis.avgCloseRate)}
          color="#22d3ee"
          subtext={`${aggregateKpis.totalWon} won / ${aggregateKpis.totalDeals} total deals`}
        />
        <KpiCard
          label="Avg Selling Price"
          value={formatCurrency(aggregateKpis.avgAsp)}
          color="#10b981"
          subtext={formatCurrency(aggregateKpis.totalWonAmount) + ' total won'}
        />
        <KpiCard
          label="Sales Cycle"
          value={formatDays(aggregateKpis.avgSalesCycle)}
          color="#8b5cf6"
          subtext="Avg days create to close"
        />
        <KpiCard
          label="Pipeline Velocity"
          value={formatCurrency(aggregateKpis.avgVelocity)}
          color="#0891b2"
          subtext="$/month throughput"
        />
      </div>

      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold mb-1">Close Rate & ASP</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Win rate and average deal size by {groupMode === 'by_rep' ? 'sales rep' : groupMode === 'by_create_month' ? 'create month' : 'create quarter'}
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis type="number" tick={{ fontFamily: 'var(--font-fira-code)', fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={groupMode === 'by_rep' ? 80 : 100} tick={{ fontFamily: 'var(--font-fira-sans)', fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'closeRate' ? `${value}%` : `$${value.toLocaleString()}`,
                    name === 'closeRate' ? 'Close Rate' : 'ASP',
                  ]}
                />
                <Legend formatter={(value) => value === 'closeRate' ? 'Close Rate (%)' : 'ASP ($)'} />
                <Bar dataKey="closeRate" name="closeRate" fill="#22d3ee" radius={[0, 4, 4, 0]} />
                <Bar dataKey="asp" name="asp" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-1">Sales Cycle & Velocity</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Average days to close and pipeline velocity ($/month)
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis type="number" tick={{ fontFamily: 'var(--font-fira-code)', fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={groupMode === 'by_rep' ? 80 : 100} tick={{ fontFamily: 'var(--font-fira-sans)', fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'salesCycle' ? `${value} days` : `$${value.toLocaleString()}`,
                    name === 'salesCycle' ? 'Avg Sales Cycle' : 'Velocity',
                  ]}
                />
                <Legend formatter={(value) => value === 'salesCycle' ? 'Sales Cycle (days)' : 'Velocity ($/mo)'} />
                <Bar dataKey="salesCycle" name="salesCycle" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="velocity" name="velocity" fill="#0891b2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <h3 className="text-lg font-semibold mb-4">
          Pipeline Metrics ({sortedData.length} {groupMode === 'by_rep' ? 'reps' : 'periods'})
        </h3>
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('display_name')}>
                  {groupMode === 'by_rep' ? 'Sales Rep' : groupMode === 'by_create_month' ? 'Month' : 'Quarter'}
                  {sortIcon('display_name')}
                </th>
                <th style={{ textAlign: 'right' }} onClick={() => handleSort('total_deals')}>
                  Total Deals{sortIcon('total_deals')}
                </th>
                <th style={{ textAlign: 'right' }} onClick={() => handleSort('deals_won')}>
                  Won{sortIcon('deals_won')}
                </th>
                <th style={{ textAlign: 'right' }} onClick={() => handleSort('deals_lost')}>
                  Lost{sortIcon('deals_lost')}
                </th>
                <th style={{ textAlign: 'right' }} onClick={() => handleSort('close_rate_pct')}>
                  Close Rate{sortIcon('close_rate_pct')}
                </th>
                <th style={{ textAlign: 'right' }} onClick={() => handleSort('asp')}>
                  ASP{sortIcon('asp')}
                </th>
                <th style={{ textAlign: 'right' }} onClick={() => handleSort('avg_sales_cycle_days')}>
                  Sales Cycle{sortIcon('avg_sales_cycle_days')}
                </th>
                <th style={{ textAlign: 'right' }} onClick={() => handleSort('pipeline_velocity_30d')}>
                  Velocity{sortIcon('pipeline_velocity_30d')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? (
                sortedData.map((row) => (
                  <tr key={row.group_key + '_' + row.trailing_window}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {row.display_name}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {row.total_deals}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums text-[#10b981]">
                      {row.deals_won}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums text-[#ef4444]">
                      {row.deals_lost}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${(row.close_rate_pct ?? 0) >= 0.3 ? 'badge-active' :
                          (row.close_rate_pct ?? 0) >= 0.15 ? 'badge-stalled' :
                            'badge-churned'
                        }`}>
                        {formatPct(row.close_rate_pct)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {formatCurrency(row.asp)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {formatDays(row.avg_sales_cycle_days)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                      {formatCurrency(row.pipeline_velocity_30d)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                    No pipeline metrics match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6">
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Data sourced from HubSpot via BigQuery. Metrics computed from deal create/close dates.
            Pipeline velocity = ($ won / total sales cycle days) x 30.
          </p>
        </div>
      </div>
    </div>
  );
}