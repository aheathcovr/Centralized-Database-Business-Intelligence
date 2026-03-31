'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────

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
  deal_owner_id: string | null;
  _loaded_at: string;
}

interface InMonthConversionProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

const SOM_CHART_COLORS = {
  expected: '#1570B6',
  won: '#3B7E6B',
  lost: '#F47C44',
  pushed: '#F47C44',
};

const WON_ORIGIN_COLORS = {
  expected: '#1570B6',
  pulledForward: '#3B7E6B',
  created: '#A67FB9',
};

const CONVERSION_BAR_COLOR = '#3B7E6B';
const CONVERSION_THRESHOLD_COLOR = '#F47C44';

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function fmt(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

function fmtDollar(value: number | null | undefined): string {
  if (value == null) return '—';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────

function SomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}</span>
          </div>
          <span className="font-mono tabular-nums text-gray-900">
            {entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function InMonthConversion({ user }: InMonthConversionProps) {
  const [data, setData] = useState<InMonthConversionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/in-month-conversion');
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
  };

  // ── Pivot: months as columns ─────────────────────────────────────────────

  const months = useMemo(() => data.map((d) => d.month_label), [data]);

  // ── Start of Month chart data ────────────────────────────────────────────

  const somChartData = useMemo(
    () =>
      data.map((d) => ({
        month: d.month_label,
        Expected: d.entering_expected,
        Won: d.won_from_expected,
        Lost: d.lost_from_expected,
        Pushed: d.pushed_from_expected,
      })),
    [data]
  );

  // ── End of Month: Won origin attribution ─────────────────────────────────
  // The SQL view tracks newly_won_deals with origin 'Created' / 'Reopened'
  // but we don't have those columns directly in the final output.
  // We can approximate:
  //   - Won from Expected = won_from_expected (was expected at start of month)
  //   - Total Won = won_total
  //   - Won from other origins = won_total - won_from_expected
  // For simplicity we attribute the difference as "Pulled Forward / Created".

  const eomChartData = useMemo(
    () =>
      data.map((d) => {
        const wonOther = Math.max(0, d.won_total - d.won_from_expected);
        return {
          month: d.month_label,
          'Won from Expected': d.won_from_expected,
          'Pulled Forward / Created': wonOther,
        };
      }),
    [data]
  );

  // ── Conversion metric chart data ─────────────────────────────────────────

  const conversionChartData = useMemo(
    () =>
      data.map((d) => ({
        month: d.month_label,
        conversion: d.in_month_conversion_pct != null
          ? Math.round(d.in_month_conversion_pct * 100 * 10) / 10
          : null,
      })),
    [data]
  );

  // ── Loading / Error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center" role="alert" aria-live="assertive">
          <svg
            className="w-8 h-8 text-red-500 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="font-medium mb-3" style={{ color: "#F47C44" }}>{error}</p>
          <button onClick={fetchData} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1570B6] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  In-Month Conversion
                </h1>
                <p className="text-sm text-gray-500">
                  Pipeline conversion analysis — % Won vs Entering Expected
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {user?.email}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ──────────────────────────────────────────────────────────────────
            SECTION 1: Start of Month Expected
        ────────────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">
              Start of Month — Pipeline Snapshot
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              Expected entering deals by month
            </span>
          </div>

          {/* Summary table — pivot columns are months */}
          <div className="card mb-6 overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">
                    Metric
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-mono"
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody >
                {/* Row: Expected in Month */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: SOM_CHART_COLORS.expected }} />
                    Expected in Month
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      {fmt(d.entering_expected)}
                    </td>
                  ))}
                </tr>
                {/* Row: Won */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: SOM_CHART_COLORS.won }} />
                    Won
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      <div>{fmt(d.won_from_expected)}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {d.entering_expected > 0
                          ? pct(d.won_from_expected / d.entering_expected)
                          : '—'}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Row: Lost */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: SOM_CHART_COLORS.lost }} />
                    Lost
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      <div>{fmt(d.lost_from_expected)}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {d.entering_expected > 0
                          ? pct(d.lost_from_expected / d.entering_expected)
                          : '—'}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Row: Pushed */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: SOM_CHART_COLORS.pushed }} />
                    Pushed
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      <div>{fmt(d.pushed_from_expected)}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {d.entering_expected > 0
                          ? pct(d.pushed_from_expected / d.entering_expected)
                          : '—'}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Row: % breakdown separator */}
                <tr className="">
                  <td className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                    % of Expected
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-2" />
                  ))}
                </tr>
                {/* Row: Win Rate */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 sticky left-0 bg-white pl-8">
                    Win Rate (Won / Resolved)
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 font-mono tabular-nums">
                      {pct(d.win_rate_pct)}
                    </td>
                  ))}
                </tr>
                {/* Row: Push Rate */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 sticky left-0 bg-white pl-8">
                    Push Rate (Pushed / Expected)
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 font-mono tabular-nums">
                      {pct(d.push_rate_pct)}
                    </td>
                  ))}
                </tr>
                {/* Row: Realized Rate */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 sticky left-0 bg-white pl-8">
                    Realized Rate (Won + Lost / Expected)
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 font-mono tabular-nums">
                      {pct(d.realized_rate_pct)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Start of Month bar chart */}
          {somChartData.length > 0 && (
            <div className="card">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Start of Month — Outcome Breakdown
              </h3>
              <p className="text-sm mb-4">
                Deals that entered the month in Expected-to-Close status and their outcome
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={somChartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }}
                  />
                  <Tooltip content={<SomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontFamily: 'var(--font-primary-sans)', fontSize: 12 }}
                  />
                  <Bar dataKey="Expected" fill={SOM_CHART_COLORS.expected} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="Expected" position="top" style={{ fontFamily: 'var(--font-primary-sans)', fontSize: 10, fill: '#696F7B' }} />
                  </Bar>
                  <Bar dataKey="Won" fill={SOM_CHART_COLORS.won} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="Won" position="top" style={{ fontFamily: 'var(--font-primary-sans)', fontSize: 10, fill: '#696F7B' }} />
                  </Bar>
                  <Bar dataKey="Lost" fill={SOM_CHART_COLORS.lost} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="Lost" position="top" style={{ fontFamily: 'var(--font-primary-sans)', fontSize: 10, fill: '#696F7B' }} />
                  </Bar>
                  <Bar dataKey="Pushed" fill={SOM_CHART_COLORS.pushed} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="Pushed" position="top" style={{ fontFamily: 'var(--font-primary-sans)', fontSize: 10, fill: '#696F7B' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            SECTION 2: End of Month Actuals — Won Attribution
        ────────────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">
              End of Month — Won Attribution
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              Total won deals by origin
            </span>
          </div>

          {/* Won attribution table — pivot columns are months */}
          <div className="card mb-6 overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">
                    Metric
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-mono"
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody >
                {/* Row: Total Won */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-50">
                    Total Won
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      {fmt(d.won_total)}
                    </td>
                  ))}
                </tr>
                {/* Row: Won from Expected */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white pl-8">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: WON_ORIGIN_COLORS.expected }} />
                    Was Expected
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      <div>{fmt(d.won_from_expected)}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {d.won_total > 0
                          ? pct(d.won_from_expected / d.won_total)
                          : '—'}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Row: Pulled Forward / Created */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white pl-8">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: WON_ORIGIN_COLORS.pulledForward }} />
                    Pulled Forward / Created in Month
                  </td>
                  {data.map((d) => {
                    const other = Math.max(0, d.won_total - d.won_from_expected);
                    return (
                      <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                        <div>{fmt(other)}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {d.won_total > 0
                            ? pct(other / d.won_total)
                            : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {/* Row: Dollar amounts */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-50">
                    Won $ (from Expected)
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      <div>{fmtDollar(d.won_amount_expected)}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        of {fmtDollar(d.entering_amount_expected)} expected
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Row: Dollar Conversion */}
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 sticky left-0 bg-white pl-8">
                    Dollar Conversion Rate
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums">
                      <span className={
                        (d.dollar_conversion_pct ?? 0) >= 0.5
                          ? 'text-green-600 font-semibold'
                          : (d.dollar_conversion_pct ?? 0) >= 0.3
                          ? 'text-amber-600'
                          : 'text-red-600 font-semibold'
                      }>
                        {pct(d.dollar_conversion_pct)}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Won attribution stacked bar chart */}
          {eomChartData.length > 0 && (
            <div className="card">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Won Deals — Origin Attribution
              </h3>
              <p className="text-sm mb-4">
                Breakdown of closed-won deals: those that were Expected at start of month vs Pulled Forward / Created during the month
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={eomChartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }}
                  />
                  <Tooltip content={<SomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontFamily: 'var(--font-primary-sans)', fontSize: 12 }}
                  />
                  <Bar dataKey="Won from Expected" stackId="won" fill={WON_ORIGIN_COLORS.expected} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Pulled Forward / Created" stackId="won" fill={WON_ORIGIN_COLORS.pulledForward} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            SECTION 3: Final Output Metric — % Won vs Entering Expected
        ────────────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">
              Final Output — In-Month Conversion
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              % Won vs Entering Expected
            </span>
          </div>

          {/* Large KPI cards */}
          {data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {data.slice(-5).map((d) => {
                const conversionPct = d.in_month_conversion_pct != null
                  ? Math.round(d.in_month_conversion_pct * 100 * 10) / 10
                  : null;
                const isGood = (d.in_month_conversion_pct ?? 0) >= 0.5;
                const isMid = (d.in_month_conversion_pct ?? 0) >= 0.3;
                return (
                  <div
                    key={d.month_label}
                    className={
                      `card border-l-4 ${
                        isGood
                          ? 'border-l-green-500'
                          : isMid
                          ? 'border-l-amber-500'
                          : 'border-l-red-500'
                      }`
                    }
                  >
                    <p className="text-[11px] uppercase tracking-widest mb-2">{d.month_label}</p>
                    <p className={
                      `text-3xl font-bold font-mono tabular-nums ${
                        isGood
                          ? 'text-green-600'
                          : isMid
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`
                    }>
                      {conversionPct != null ? `${conversionPct}%` : '—'}
                    </p>
                    <p className="text-[11px] mt-1.5">
                      {fmt(d.won_from_expected)} won / {fmt(d.entering_expected)} expected
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full pivot table — all months */}
          <div className="card mb-6 overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">
                    Metric
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-mono"
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody >
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    Entering Expected
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      {fmt(d.entering_expected)}
                    </td>
                  ))}
                </tr>
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    Won from Expected
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      {fmt(d.won_from_expected)}
                    </td>
                  ))}
                </tr>
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    Lost from Expected
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      {fmt(d.lost_from_expected)}
                    </td>
                  ))}
                </tr>
                <tr >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    Pushed from Expected
                  </td>
                  {data.map((d) => (
                    <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-mono tabular-nums">
                      <div>{fmt(d.pushed_from_expected)}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {fmt(d.pushed_expected_to_expected)} same · {fmt(d.pushed_expected_to_later)} later
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-50">
                    In-Month Conversion %
                  </td>
                  {data.map((d) => {
                    const isGood = (d.in_month_conversion_pct ?? 0) >= 0.5;
                    const isMid = (d.in_month_conversion_pct ?? 0) >= 0.3;
                    return (
                      <td key={d.month_label} className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums font-bold">
                        <span className={
                          isGood
                            ? 'text-green-600'
                            : isMid
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }>
                          {pct(d.in_month_conversion_pct)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Conversion rate bar chart */}
          {conversionChartData.length > 0 && (
            <div className="card">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                In-Month Conversion Trend
              </h3>
              <p className="text-sm mb-4">
                % Won vs Entering Expected — higher is better. Red reference line at 30%.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={conversionChartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      value != null ? `${value}%` : '—',
                      'Conversion',
                    ]}
                    contentStyle={{
                      fontFamily: 'var(--font-primary-sans)',
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                  />
                  <Bar
                    dataKey="conversion"
                    radius={[4, 4, 0, 0]}
                  >
                    {conversionChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          (entry.conversion ?? 0) >= 50
                            ? SOM_CHART_COLORS.won
                            : (entry.conversion ?? 0) >= 30
                            ? SOM_CHART_COLORS.pushed
                            : SOM_CHART_COLORS.lost
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="conversion"
                      position="top"
                      formatter={(v: number | null) => (v != null ? `${v}%` : '')}
                      style={{ fontFamily: 'var(--font-primary-sans)', fontSize: 11, fill: '#696F7B' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
