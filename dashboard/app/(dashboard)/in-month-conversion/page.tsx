'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { DateRangePicker, SalesRepFilter } from '@/components/filters';
import type { DateRange, SalesRepFilterValue } from '@/components/filters';

interface InMonthConversionRow {
  month_start: string;
  month_label: string;
  year: number;
  month_number: number;
  entering_expected: number;
  entering_later_month: number;
  entering_total: number;
  won_from_expected: number;
  lost_from_expected: number;
  pushed_from_expected: number;
  won_total: number;
  lost_total: number;
  pushed_total: number;
  no_change_total: number;
  in_month_conversion_pct: number | null;
  win_rate_pct: number | null;
  loss_rate_pct: number | null;
  push_rate_pct: number | null;
  realized_rate_pct: number | null;
  won_amount_expected: number;
  entering_amount_expected: number;
  lost_amount_expected: number;
  pushed_amount_expected: number;
  dollar_conversion_pct: number | null;
  pushed_expected_to_expected: number;
  pushed_expected_to_later: number;
  _loaded_at: string;
}

interface ChartRow {
  month: string;
  enteringExpected: number;
  won: number;
  lost: number;
  pushed: number;
  conversionRate: number;
}

export default function InMonthConversionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InMonthConversionRow[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [salesRepFilter, setSalesRepFilter] = useState<SalesRepFilterValue>({ reps: [], groups: [] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set('start_month', dateRange.startDate);
        params.set('end_month', dateRange.endDate);
      }
      if (salesRepFilter.reps.length > 0) {
        // Note: API currently supports single rep only; uses first selected rep
        params.set('deal_owner_id', salesRepFilter.reps[0]);
      }

      const qs = params.toString();
      const url = '/api/in-month-conversion' + (qs ? `?${qs}` : '');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Failed to fetch in-month conversion data:', err);
      setError('Failed to load in-month conversion data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, salesRepFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transform API rows into chart-friendly format
  const chartData: ChartRow[] = data.map((row) => ({
    month: row.month_label,
    enteringExpected: row.entering_expected,
    won: row.won_from_expected,
    lost: row.lost_from_expected,
    pushed: row.pushed_from_expected,
    conversionRate: row.in_month_conversion_pct != null
      ? Math.round(row.in_month_conversion_pct * 100)
      : 0,
  }));

  // Aggregate summary values
  const totalEntering = data.reduce((s, d) => s + d.entering_expected, 0);
  const totalWon = data.reduce((s, d) => s + d.won_from_expected, 0);
  const totalLost = data.reduce((s, d) => s + d.lost_from_expected, 0);
  const totalPushed = data.reduce((s, d) => s + d.pushed_from_expected, 0);
  const resolved = totalWon + totalLost + totalPushed;
  const avgConversion = resolved > 0 ? Math.round((totalWon / resolved) * 100) : 0;

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">In-Month Conversion</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Track what percentage of expected deals actually close won within the month
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <SalesRepFilter
            value={salesRepFilter}
            onChange={setSalesRepFilter}
          />
        </div>
        {(dateRange || salesRepFilter.reps.length > 0 || salesRepFilter.groups.length > 0) && (
          <div className="flex items-end">
            <button
              className="text-sm hover:underline" style={{ color: "var(--accent)" }}
              onClick={() => {
                setDateRange(null);
                setSalesRepFilter({ reps: [], groups: [] });
              }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="card mb-6" style={{ borderTop: "2px solid #F47C44" }}>
          <p className="text-sm" style={{ color: "#F47C44" }}>{error}</p>
        </div>
      )}

      {loading && data.length > 0 && (
        <div className="flex justify-center mb-4">
          <div className="spinner"></div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card-glow">
          <p className="text-[11px] uppercase tracking-widest mb-2">Entering Expected</p>
          <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">{totalEntering}</p>
        </div>
        <div className="card-glow" style={{ borderTopColor: "#3B7E6B" }}>
          <p className="text-[11px] uppercase tracking-widest mb-2">Won</p>
          <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">{totalWon}</p>
        </div>
        <div className="card-glow" style={{ borderTopColor: "#26A2DC" }}>
          <p className="text-[11px] uppercase tracking-widest mb-2">Avg Conversion Rate</p>
          <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">{avgConversion}%</p>
        </div>
        <div className="card-glow" style={{ borderTopColor: "#A67FB9" }}>
          <p className="text-[11px] uppercase tracking-widest mb-2">Pushed</p>
          <p className="text-3xl font-bold text-purple-600 font-mono tabular-nums">{totalPushed}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-1">Monthly Pipeline Outcomes</h3>
          <p className="text-sm mb-4">Won, Lost, and Pushed from expected pipeline</p>
          <div role="img" aria-label="Deal conversion bar chart showing won, lost, and pushed deals by month">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="month" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }} />
                <YAxis tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="won" name="Won" fill="#3B7E6B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" name="Lost" fill="#F47C44" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pushed" name="Pushed" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-1">Conversion Rate Trend</h3>
          <p className="text-sm mb-4">Month-over-month in-month conversion percentage</p>
          <div role="img" aria-label="Win rate trend line chart showing monthly conversion percentage with 50% target reference line">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="month" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }}
                />
                <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} />
                <ReferenceLine y={50} stroke="#F47C44" strokeDasharray="4 4" strokeOpacity="0.6" label={{ value: '50% target', position: 'insideTop', fill: '#F47C44', fontSize: 11 }} />
                <Line type="monotone" dataKey="conversionRate" name="Rate" stroke="#1570B6" strokeWidth={2} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {data.length === 0 && !loading && (
        <div className="card">
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>No Data Available</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No in-month conversion data found for the selected filters.
              Try adjusting the date range or sales rep filter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
