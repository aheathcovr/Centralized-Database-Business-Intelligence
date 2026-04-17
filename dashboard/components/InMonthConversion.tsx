'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InMonthConversionRow {
  period_type: 'monthly' | 'quarterly';
  period_start: string;
  period_label: string;
  
  // SOM
  expected_count: number;
  won_count: number;
  lost_count: number;
  pushed_count: number;
  pct_won: number | null;
  pct_lost: number | null;
  pct_pushed: number | null;
  expected_arr: number;
  won_arr: number;
  lost_arr: number;
  pushed_arr: number;
  pct_won_arr: number | null;
  
  // EOM
  total_won_count: number;
  won_was_expected_count: number;
  won_was_later_month_count: number;
  won_created_in_month_count: number;
  pct_won_was_expected: number | null;
  pct_won_was_later_month: number | null;
  pct_won_created_in_month: number | null;
  total_won_arr: number;
  won_was_expected_arr: number;
  won_was_later_month_arr: number;
  won_created_in_month_arr: number;
  
  // Final
  pct_won_vs_entering_expected: number | null;
}

interface InMonthConversionProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  expected: '#1570B6',
  won: '#3B7E6B',
  lost: '#F47C44',
  pushed: '#F47C44',
  created: '#A67FB9',
  laterMonth: '#8B5CF6',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

function fmt(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

function fmtDollar(value: number | null): string {
  if (value == null) return '—';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getColorClass(pct: number | null): string {
  if (pct == null) return 'text-gray-900';
  if (pct >= 50) return 'text-[#3B7E6B]'; // won/green
  if (pct >= 30) return 'text-amber-600';
  return 'text-red-500';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToggleSwitch({
  label,
  isOn,
  onToggle,
}: {
  label: string;
  isOn: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 group"
      aria-pressed={isOn}
    >
      <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
        {label}
      </span>
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${
          isOn ? 'bg-[#1570B6]' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            isOn ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}

function TableCell({
  children,
  className = '',
  numeric = false,
  bold = false,
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
  bold?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 text-sm ${numeric ? 'text-right font-mono tabular-nums' : ''} ${
        bold ? 'font-semibold' : ''
      } ${className}`}
    >
      {children}
    </td>
  );
}

function MetricRow({
  label,
  values,
  subtextValues,
  color,
  isSectionHeader = false,
}: {
  label: string;
  values: (number | null)[];
  subtextValues?: (number | null)[];
  color?: string;
  isSectionHeader?: boolean;
}) {
  return (
    <tr className={isSectionHeader ? 'bg-gray-50' : ''}>
      <td
        className={`px-4 py-3 text-sm whitespace-nowrap ${
          isSectionHeader ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
        } sticky left-0 ${isSectionHeader ? 'bg-gray-50' : 'bg-white'} z-10`}
      >
        {color && (
          <span
            className="inline-block w-3 h-3 rounded-sm mr-2"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </td>
      {values.map((val, i) => (
        <TableCell key={i} numeric>
          <span className={isSectionHeader ? 'font-semibold' : ''}>
            {val != null ? val.toLocaleString() : '—'}
          </span>
          {subtextValues && subtextValues[i] != null && (
            <span className="block text-xs text-gray-500">{pct(subtextValues[i])}</span>
          )}
        </TableCell>
      ))}
    </tr>
  );
}

function PercentRow({
  label,
  values,
  color,
  isSectionHeader = false,
  invertColors = false,
}: {
  label: string;
  values: (number | null)[];
  color?: string;
  isSectionHeader?: boolean;
  invertColors?: boolean;
}) {
  return (
    <tr className={isSectionHeader ? 'bg-gray-50' : ''}>
      <td
        className={`px-4 py-3 text-sm whitespace-nowrap ${
          isSectionHeader ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
        } sticky left-0 ${isSectionHeader ? 'bg-gray-50' : 'bg-white'} z-10`}
      >
        {color && (
          <span
            className="inline-block w-3 h-3 rounded-sm mr-2"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </td>
      {values.map((val, i) => (
        <TableCell key={i} numeric>
          <span className={getColorClass(val)}>
            {pct(val)}
          </span>
        </TableCell>
      ))}
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InMonthConversion({ user }: InMonthConversionProps) {
  const [data, setData] = useState<InMonthConversionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');

  const fetchData = useCallback(async (type: 'monthly' | 'quarterly') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/in-month-conversion?period_type=${type}`);
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
  }, []);

  useEffect(() => {
    fetchData(periodType);
  }, [fetchData, periodType]);

  const handleToggle = () => {
    setPeriodType((prev) => (prev === 'monthly' ? 'quarterly' : 'monthly'));
  };

  // Extract period labels for table columns
  const periodLabels = useMemo(() => data.map((d) => d.period_label), [data]);

  // SOM metrics arrays
  const somMetrics = useMemo(() => {
    if (data.length === 0) return null;
    return {
      expected_count: data.map((d) => d.expected_count),
      won_count: data.map((d) => d.won_count),
      lost_count: data.map((d) => d.lost_count),
      pushed_count: data.map((d) => d.pushed_count),
      pct_won: data.map((d) => d.pct_won),
      pct_lost: data.map((d) => d.pct_lost),
      pct_pushed: data.map((d) => d.pct_pushed),
      expected_arr: data.map((d) => d.expected_arr),
      won_arr: data.map((d) => d.won_arr),
      lost_arr: data.map((d) => d.lost_arr),
      pushed_arr: data.map((d) => d.pushed_arr),
      pct_won_arr: data.map((d) => d.pct_won_arr),
    };
  }, [data]);

  // EOM metrics arrays
  const eomMetrics = useMemo(() => {
    if (data.length === 0) return null;
    return {
      total_won_count: data.map((d) => d.total_won_count),
      won_was_expected_count: data.map((d) => d.won_was_expected_count),
      won_was_later_month_count: data.map((d) => d.won_was_later_month_count),
      won_created_in_month_count: data.map((d) => d.won_created_in_month_count),
      pct_won_was_expected: data.map((d) => d.pct_won_was_expected),
      pct_won_was_later_month: data.map((d) => d.pct_won_was_later_month),
      pct_won_created_in_month: data.map((d) => d.pct_won_created_in_month),
      total_won_arr: data.map((d) => d.total_won_arr),
      won_was_expected_arr: data.map((d) => d.won_was_expected_arr),
      won_was_later_month_arr: data.map((d) => d.won_was_later_month_arr),
      won_created_in_month_arr: data.map((d) => d.won_created_in_month_arr),
    };
  }, [data]);

  // Final metric
  const finalMetric = useMemo(() => {
    return data.map((d) => d.pct_won_vs_entering_expected);
  }, [data]);

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
          <p className="font-medium mb-3" style={{ color: '#F47C44' }}>
            {error}
          </p>
          <button onClick={() => fetchData(periodType)} className="btn-primary text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No data available</p>
          <button onClick={() => fetchData(periodType)} className="btn-primary text-sm">
            Refresh
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
                <h1 className="text-xl font-bold text-gray-900">In-Month Conversion</h1>
                <p className="text-sm text-gray-500">
                  Pipeline conversion analysis — % Won vs Entering Expected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <ToggleSwitch
                label="Quarterly"
                isOn={periodType === 'quarterly'}
                onToggle={handleToggle}
              />
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period label badge */}
        <div className="mb-6">
          <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-1 uppercase tracking-wider">
            {periodType === 'monthly' ? 'Monthly' : 'Quarterly'} View
          </span>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 1: Start of Month, Looking Forward
        ════════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Start of Month, Looking Forward
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              Expected deals and their outcomes
            </span>
          </div>

          <div className="card overflow-x-auto">
            <table className="dashboard-table w-full min-w-[800px]">
              <thead>
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 w-64"
                    style={{ minWidth: '256px' }}
                  >
                    Metric
                  </th>
                  {periodLabels.map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-mono whitespace-nowrap"
                      style={{ minWidth: '100px' }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* ── Count Section ── */}
                <tr className="bg-gray-100">
                  <td
                    colSpan={periodLabels.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10"
                  >
                    # Deals
                  </td>
                </tr>

                <MetricRow
                  label="Expected in Month"
                  values={somMetrics?.expected_count || []}
                  color={COLORS.expected}
                  isSectionHeader
                />
                <MetricRow
                  label="Won in Month"
                  values={somMetrics?.won_count || []}
                  subtextValues={somMetrics?.pct_won}
                  color={COLORS.won}
                />
                <MetricRow
                  label="Lost"
                  values={somMetrics?.lost_count || []}
                  subtextValues={somMetrics?.pct_lost}
                  color={COLORS.lost}
                />
                <MetricRow
                  label="Pushed"
                  values={somMetrics?.pushed_count || []}
                  subtextValues={somMetrics?.pct_pushed}
                  color={COLORS.pushed}
                />

                <tr className="bg-gray-100">
                  <td
                    colSpan={periodLabels.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10"
                  >
                    % of Expected
                  </td>
                </tr>

                <PercentRow label="% Won" values={somMetrics?.pct_won || []} color={COLORS.won} />
                <PercentRow label="% Lost" values={somMetrics?.pct_lost || []} color={COLORS.lost} />
                <PercentRow label="% Pushed" values={somMetrics?.pct_pushed || []} color={COLORS.pushed} />

                {/* ── ARR Section ── */}
                <tr className="bg-gray-100">
                  <td
                    colSpan={periodLabels.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10"
                  >
                    $ ARR
                  </td>
                </tr>

                <MetricRow
                  label="Expected in Month ($)"
                  values={somMetrics?.expected_arr || []}
                  color={COLORS.expected}
                  isSectionHeader
                />
                <MetricRow label="Won in Month ($)" values={somMetrics?.won_arr || []} color={COLORS.won} />
                <MetricRow label="Lost ($)" values={somMetrics?.lost_arr || []} color={COLORS.lost} />
                <MetricRow label="Pushed ($)" values={somMetrics?.pushed_arr || []} color={COLORS.pushed} />

                <tr className="bg-gray-100">
                  <td
                    colSpan={periodLabels.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10"
                  >
                    % of Expected ($)
                  </td>
                </tr>

                <PercentRow label="% Won ($)" values={somMetrics?.pct_won_arr || []} color={COLORS.won} />
              </tbody>
            </table>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 2: End of Month, Looking Back
        ════════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">End of Month, Looking Back</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              Won deals by origin
            </span>
          </div>

          <div className="card overflow-x-auto">
            <table className="dashboard-table w-full min-w-[800px]">
              <thead>
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 w-64"
                    style={{ minWidth: '256px' }}
                  >
                    Metric
                  </th>
                  {periodLabels.map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-mono whitespace-nowrap"
                      style={{ minWidth: '100px' }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* ── Count Section ── */}
                <tr className="bg-gray-100">
                  <td
                    colSpan={periodLabels.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10"
                  >
                    # Deals
                  </td>
                </tr>

                <MetricRow
                  label="Total Won (# Deals)"
                  values={eomMetrics?.total_won_count || []}
                  color={COLORS.won}
                  isSectionHeader
                />
                <MetricRow
                  label="Was Expected in Month"
                  values={eomMetrics?.won_was_expected_count || []}
                  subtextValues={eomMetrics?.pct_won_was_expected}
                  color={COLORS.expected}
                />
                <MetricRow
                  label="Was Expected in Later Month"
                  values={eomMetrics?.won_was_later_month_count || []}
                  subtextValues={eomMetrics?.pct_won_was_later_month}
                  color={COLORS.laterMonth}
                />
                <MetricRow
                  label="Created in Month"
                  values={eomMetrics?.won_created_in_month_count || []}
                  subtextValues={eomMetrics?.pct_won_created_in_month}
                  color={COLORS.created}
                />

                <tr className="bg-gray-100">
                  <td
                    colSpan={periodLabels.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10"
                  >
                    % of Won
                  </td>
                </tr>

                <PercentRow
                  label="% Was Expected"
                  values={eomMetrics?.pct_won_was_expected || []}
                  color={COLORS.expected}
                />
                <PercentRow
                  label="% Was Later Month"
                  values={eomMetrics?.pct_won_was_later_month || []}
                  color={COLORS.laterMonth}
                />
                <PercentRow
                  label="% Created"
                  values={eomMetrics?.pct_won_created_in_month || []}
                  color={COLORS.created}
                />

                {/* ── ARR Section ── */}
                <tr className="bg-gray-100">
                  <td
                    colSpan={periodLabels.length + 1}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10"
                  >
                    $ ARR
                  </td>
                </tr>

                <MetricRow
                  label="Total Won $ ARR"
                  values={eomMetrics?.total_won_arr || []}
                  color={COLORS.won}
                  isSectionHeader
                />
                <MetricRow
                  label="Was Expected ($)"
                  values={eomMetrics?.won_was_expected_arr || []}
                  color={COLORS.expected}
                />
                <MetricRow
                  label="Was Later Month ($)"
                  values={eomMetrics?.won_was_later_month_arr || []}
                  color={COLORS.laterMonth}
                />
                <MetricRow
                  label="Created ($)"
                  values={eomMetrics?.won_created_in_month_arr || []}
                  color={COLORS.created}
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 3: Final Metric Row
        ════════════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Final Metric</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              % Won vs Entering Expected
            </span>
          </div>

          <div className="card overflow-x-auto">
            <table className="dashboard-table w-full min-w-[800px]">
              <thead>
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 w-64"
                    style={{ minWidth: '256px' }}
                  >
                    Metric
                  </th>
                  {periodLabels.map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-mono whitespace-nowrap"
                      style={{ minWidth: '100px' }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[#1570B6]/5">
                  <td
                    className="px-4 py-4 text-sm font-bold text-gray-900 sticky left-0 bg-[#1570B6]/5 z-10"
                  >
                    % Won vs Entering Expected
                  </td>
                  {finalMetric.map((val, i) => (
                    <td key={i} className="px-4 py-4 text-right">
                      <span
                        className={`text-xl font-bold font-mono tabular-nums ${getColorClass(val)}`}
                      >
                        {pct(val)}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
