'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';

interface SupportMetricsRow {
  week_start: string;
  year_week: string;
  new_tickets: number;
  closed_tickets: number;
  csat_positive: number;
  csat_negative: number;
  csat_total: number;
  csat_score_pct: number | null;
  first_response_avg_seconds: number | null;
  first_response_median_seconds: number | null;
  first_response_avg_minutes: number | null;
  first_response_median_minutes: number | null;
  first_response_avg_hours: number | null;
  first_response_median_hours: number | null;
}

export default function SupportMetricsDashboard() {
  const [data, setData] = useState<SupportMetricsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/support-metrics');
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const result = await response.json();
      // API returns newest-first; reverse for chronological display
      setData(result.metrics.slice().reverse());
    } catch (err) {
      console.error('Failed to fetch support metrics:', err);
      setError('Failed to load support metrics. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Format week label from YYYY-MM-DD to e.g. "Mar 10"
  const formatWeekLabel = (weekStart: string): string => {
    try {
      const d = new Date(weekStart + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return weekStart;
    }
  };

  // --- Ticket Volume Data ---
  const ticketVolumeData = data.map((row) => ({
    week: formatWeekLabel(row.week_start),
    New: row.new_tickets,
    Closed: row.closed_tickets,
  }));

  // --- CSAT Data ---
  const csatData = data.map((row) => ({
    week: formatWeekLabel(row.week_start),
    Positive: row.csat_positive,
    Negative: row.csat_negative,
    Score: row.csat_score_pct != null ? Math.round(row.csat_score_pct * 100) : null,
  }));

  // --- First Response Time Data ---
  const frtData = data.map((row) => ({
    week: formatWeekLabel(row.week_start),
    avgMin: row.first_response_avg_minutes != null
      ? Math.round(row.first_response_avg_minutes * 10) / 10
      : null,
    medianMin: row.first_response_median_minutes != null
      ? Math.round(row.first_response_median_minutes * 10) / 10
      : null,
  }));

  // Summary cards (latest week)
  const latest = data.length > 0 ? data[data.length - 1] : null;

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {latest && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card border-l-4 border-l-covr-blue">
              <p className="text-sm text-gray-600 mb-1">Latest Week</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatWeekLabel(latest.week_start)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {latest.year_week}
              </p>
            </div>
            <div className="card border-l-4 border-l-green-500">
              <p className="text-sm text-gray-600 mb-1">New Tickets</p>
              <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
                {latest.new_tickets}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                vs {latest.closed_tickets} closed
              </p>
            </div>
            <div className="card border-l-4 border-l-purple-500">
              <p className="text-sm text-gray-600 mb-1">CSAT Score</p>
              <p className="text-3xl font-bold text-purple-600 font-mono tabular-nums">
                {latest.csat_score_pct != null
                  ? `${Math.round(latest.csat_score_pct * 100)}%`
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {latest.csat_positive} positive / {latest.csat_negative} negative
              </p>
            </div>
            <div className="card border-l-4 border-l-teal-500">
              <p className="text-sm text-gray-600 mb-1">First Response</p>
              <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">
                {latest.first_response_avg_minutes != null
                  ? `${Math.round(latest.first_response_avg_minutes * 10) / 10}m`
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                avg / median{' '}
                {latest.first_response_median_minutes != null
                  ? `${Math.round(latest.first_response_median_minutes * 10) / 10}m`
                  : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Chart 1: Ticket Volume Trend */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Ticket Volume / New vs Closed
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Weekly ticket creation and resolution counts. Balancing new and closed tickets indicates healthy throughput.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={ticketVolumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontFamily: 'var(--font-fira-sans)',
                  fontSize: 13,
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-gray-700">{value}</span>
                )}
              />
              <Bar dataKey="New" fill="#059669" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Closed" fill="#64748b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: CSAT Score Trend */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            CSAT Score Trend
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Customer satisfaction responses stacked by sentiment. Line overlay shows the positive-response percentage each week.
          </p>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={csatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="count"
                tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }}
                allowDecimals={false}
                label={{
                  value: 'Responses',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#6b7280', fontSize: 12 },
                }}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }}
                label={{
                  value: 'CSAT %',
                  angle: 90,
                  position: 'insideRight',
                  style: { fill: '#6b7280', fontSize: 12 },
                }}
              />
              <Tooltip
                contentStyle={{
                  fontFamily: 'var(--font-fira-sans)',
                  fontSize: 13,
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'CSAT %' && value != null) return [`${value}%`, name];
                  return [value ?? 'N/A', name];
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-gray-700">{value}</span>
                )}
              />
              <Bar
                dataKey="Positive"
                yAxisId="count"
                stackId="csat"
                fill="#059669"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="Negative"
                yAxisId="count"
                stackId="csat"
                fill="#dc2626"
                radius={[2, 2, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="Score"
                yAxisId="pct"
                name="CSAT %"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ r: 3, fill: '#7c3aed' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: First Response Time Trend */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            First Response Time Trend
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Average and median first-response time in minutes. Lower is better / fast first responses drive higher CSAT.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={frtData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-fira-code)', fontSize: 11 }}
                tickFormatter={(v) => `${v}m`}
                label={{
                  value: 'Minutes',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#6b7280', fontSize: 12 },
                }}
              />
              <Tooltip
                contentStyle={{
                  fontFamily: 'var(--font-fira-sans)',
                  fontSize: 13,
                }}
                formatter={(value: any, name: string) => {
                  if (value == null) return ['N/A', name];
                  return [`${value} min`, name];
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-gray-700">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="avgMin"
                name="Avg (min)"
                stroke="#1e40af"
                strokeWidth={2}
                dot={{ r: 3, fill: '#1e40af' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="medianMin"
                name="Median (min)"
                stroke="#0d9488"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#0d9488' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Weekly Breakdown ({data.length} weeks)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSAT +
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSAT -
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSAT %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FRT Avg
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FRT Median
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={row.week_start} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatWeekLabel(row.week_start)}
                      <span className="text-xs text-gray-400 ml-2">
                        {row.year_week}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700 font-mono tabular-nums">
                      {row.new_tickets}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700 font-mono tabular-nums">
                      {row.closed_tickets}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-green-600 font-mono tabular-nums">
                      {row.csat_positive}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-red-600 font-mono tabular-nums">
                      {row.csat_negative}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium font-mono tabular-nums">
                      {row.csat_score_pct != null
                        ? `${Math.round(row.csat_score_pct * 100)}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700 font-mono tabular-nums">
                      {row.first_response_avg_minutes != null
                        ? `${Math.round(row.first_response_avg_minutes * 10) / 10}m`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700 font-mono tabular-nums">
                      {row.first_response_median_minutes != null
                        ? `${Math.round(row.first_response_median_minutes * 10) / 10}m`
                        : '—'}
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
