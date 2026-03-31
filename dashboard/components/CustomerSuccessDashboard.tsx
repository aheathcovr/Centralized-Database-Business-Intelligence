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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CsPeriodRow {
  period_start: string;
  period_type: string;
  period_label: string;
  csat_positive: number;
  csat_negative: number;
  csat_total: number;
  csat_score_pct: number | null;
}

interface NpsPeriodRow {
  period_start: string;
  period_type: string;
  period_label: string;
  total_responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps_score: number | null;
}

interface DomainRow {
  domain: string;
  total_ratings: number;
  csat_positive: number;
  csat_negative: number;
  csat_score_pct: number | null;
}

interface OnboardingCorp {
  corporation_name: string;
  task_status_label: string;
  total_facilities: number;
  facilities_in_dh: number;
  go_live_date: string | null;
  onboarding_start_date: string | null;
  hubspot_url: string | null;
  product_mix: string;
}

interface CustomerSuccessData {
  csatPeriodic: CsPeriodRow[];
  npsPeriodic: NpsPeriodRow[];
  csatByDomain: DomainRow[];
  npsByDomain: DomainRow[];
  onboardingCorporations: OnboardingCorp[];
  onboardingFacilities: OnboardingCorp[];
  summary: {
    totalCsatResponses: number;
    avgCsatScore: number | null;
    totalNpsResponses: number;
    avgNpsScore: number | null;
    inImplementation: number;
    inOnboarding: number;
    stalledCount: number;
    activeCount: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#3B7E6B',
  Implementation: '#1570B6',
  Stalled: '#F47C44',
  Churned: '#F47C44',
  Offboarding: '#64748b',
};

export default function CustomerSuccessDashboard() {
  const [data, setData] = useState<CustomerSuccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csView, setCsView] = useState<'month' | 'quarter'>('month');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/customer-success');
      if (!response.ok) throw new Error('Request failed: ' + response.status);
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch customer success data:', err);
      setError('Failed to load customer success data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="font-medium mb-3" style={{ color: '#F47C44' }}>{error}</p>
          <button onClick={fetchData} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const filteredCsat = data.csatPeriodic.filter(r => r.period_type === csView);
  const filteredNps = data.npsPeriodic.filter(r => r.period_type === csView);

  const csatChartData = filteredCsat.slice().reverse().map(r => ({
    label: r.period_label,
    Positive: r.csat_positive,
    Negative: r.csat_negative,
    Score: r.csat_score_pct != null ? Math.round(r.csat_score_pct) : null,
  }));

  const npsChartData = filteredNps.slice().reverse().map(r => ({
    label: r.period_label,
    Promoters: r.promoters,
    Passives: r.passives,
    Detractors: r.detractors,
    Score: r.nps_score,
  }));

  const onboardingStatusData = [
    { name: 'Active', value: data.summary.activeCount, color: STATUS_COLORS.Active },
    { name: 'Implementation', value: data.summary.inImplementation, color: STATUS_COLORS.Implementation },
    { name: 'Stalled', value: data.summary.stalledCount, color: STATUS_COLORS.Stalled },
  ].filter(d => d.value > 0);

  const csatDomainChartData = data.csatByDomain.slice(0, 15).map(r => ({
    domain: r.domain.length > 30 ? r.domain.substring(0, 28) + '...' : r.domain,
    Total: r.total_ratings,
    Positive: r.csat_positive,
    Negative: r.csat_negative,
    Score: r.csat_score_pct != null ? Math.round(r.csat_score_pct) : null,
  }));

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-glow" style={{ borderTopColor: '#A67FB9' }}>
            <p className="text-[11px] uppercase tracking-widest mb-2">Avg CSAT Score</p>
            <p className="text-3xl font-bold text-purple-600 font-mono tabular-nums">
              {data.summary.avgCsatScore != null ? Math.round(data.summary.avgCsatScore) + '%' : 'N/A'}
            </p>
            <p className="text-[11px] mt-1.5">{data.summary.totalCsatResponses} total responses</p>
          </div>
          <div className="card-glow" style={{ borderTopColor: '#26A2DC' }}>
            <p className="text-[11px] uppercase tracking-widest mb-2">Avg NPS Score</p>
            <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">
              {data.summary.avgNpsScore != null ? Math.round(data.summary.avgNpsScore) : 'N/A'}
            </p>
            <p className="text-[11px] mt-1.5">{data.summary.totalNpsResponses} total responses</p>
          </div>
          <div className="card-glow" style={{ borderTopColor: '#1570B6' }}>
            <p className="text-[11px] uppercase tracking-widest mb-2">In Implementation</p>
            <p className="text-3xl font-bold text-blue-600 font-mono tabular-nums">
              {data.summary.inImplementation}
            </p>
            <p className="text-[11px] mt-1.5">+ {data.summary.stalledCount} stalled</p>
          </div>
          <div className="card-glow" style={{ borderTopColor: '#3B7E6B' }}>
            <p className="text-[11px] uppercase tracking-widest mb-2">Active Accounts</p>
            <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
              {data.summary.activeCount}
            </p>
            <p className="text-[11px] mt-1.5">{data.summary.inOnboarding} in onboarding</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>View by:</span>
          <button
            onClick={() => setCsView('month')}
            className={`px-3 py-1 rounded text-sm ${csView === 'month' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Month
          </button>
          <button
            onClick={() => setCsView('quarter')}
            className={`px-3 py-1 rounded text-sm ${csView === 'quarter' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Quarter
          </button>
        </div>

        {/* CSAT Score Trend */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-1">CSAT Score {csView === 'month' ? 'Monthly' : 'Quarterly'}</h3>
          <p className="text-sm mb-4">Customer satisfaction responses stacked by sentiment. Line shows positive-response percentage.</p>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={csatChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="label" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis yAxisId="count" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} />
              <Tooltip contentStyle={{ fontFamily: 'var(--font-primary-sans)', fontSize: 13 }} formatter={(value: any, name: string) => { if (name === 'CSAT %' && value != null) return [value + '%', name]; return [value ?? 'N/A', name]; }} />
              <Legend formatter={value => <span className="text-sm text-gray-700">{value}</span>} />
              <Bar dataKey="Positive" yAxisId="count" stackId="csat" fill="#3B7E6B" />
              <Bar dataKey="Negative" yAxisId="count" stackId="csat" fill="#F47C44" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="Score" yAxisId="pct" name="CSAT %" stroke="#A67FB9" strokeWidth={2} dot={{ r: 3, fill: '#A67FB9' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* NPS Score Trend */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-1">NPS Score {csView === 'month' ? 'Monthly' : 'Quarterly'}</h3>
          <p className="text-sm mb-4">Net Promoter Score breakdown. Promoters (9-10), Passives (7-8), Detractors (0-6).</p>
          {npsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={npsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="label" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="count" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="pct" orientation="right" domain={[-100, 100]} tickFormatter={v => v + ''} tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-primary-sans)', fontSize: 13 }} />
                <Legend formatter={value => <span className="text-sm text-gray-700">{value}</span>} />
                <Bar dataKey="Promoters" yAxisId="count" stackId="nps" fill="#3B7E6B" />
                <Bar dataKey="Passives" yAxisId="count" stackId="nps" fill="#F47C44" />
                <Bar dataKey="Detractors" yAxisId="count" stackId="nps" fill="#F47C44" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="Score" yAxisId="pct" name="NPS" stroke="#0d9488" strokeWidth={2} dot={{ r: 3, fill: '#0d9488' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px]" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <p className="text-sm">No NPS data available yet.</p>
                <p className="text-xs mt-1">Wire up your NPS source in bigquery/nps_monthly_quarterly.sql</p>
              </div>
            </div>
          )}
        </div>

        {/* CSAT by Domain */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-1">CSAT by Domain URL</h3>
          <p className="text-sm mb-4">Customer satisfaction scores grouped by the domain URL of the Intercom conversation source.</p>
          {csatDomainChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, csatDomainChartData.length * 30)}>
              <BarChart data={csatDomainChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis type="number" tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} />
                <YAxis dataKey="domain" type="category" width={200} tick={{ fontFamily: 'var(--font-primary-sans)', fill: '#696F7B', fontSize: 11 }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-primary-sans)', fontSize: 13 }} formatter={(value: any, name: string) => { if (name === 'Score' && value != null) return [value + '%', name]; return [value ?? 'N/A', name]; }} />
                <Legend formatter={value => <span className="text-sm text-gray-700">{value}</span>} />
                <Bar dataKey="Positive" fill="#3B7E6B" />
                <Bar dataKey="Negative" fill="#F47C44" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No CSAT data with domain URLs found.</p>
          )}
        </div>

        {/* NPS by Domain */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-1">NPS by Domain URL</h3>
          <p className="text-sm mb-4">NPS breakdown by customer domain (available once NPS source is connected).</p>
          <div className="flex items-center justify-center h-[100px]" style={{ color: 'var(--text-muted)' }}>
            <div className="text-center">
              <p className="text-sm">No NPS data available yet.</p>
              <p className="text-xs mt-1">Wire up your NPS source in bigquery/nps_monthly_quarterly.sql</p>
            </div>
          </div>
        </div>

        {/* Onboarding: Corporations & Facilities */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-1">Onboarding Pipeline (Corporations)</h3>
          <p className="text-sm mb-4">Corporations in Implementation or Onboarding status from ClickUp, with facility counts and go-live dates.</p>
          {onboardingStatusData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={onboardingStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }: any) => name + ': ' + value}>
                      {onboardingStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-3">
                {onboardingStatusData.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm font-medium">{d.name}</span>
                    <span className="text-sm font-mono ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Corporation</th>
                  <th>Status</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Facilities</th>
                  <th style={{ textAlign: 'right' }}>In DH</th>
                  <th>Go-Live</th>
                  <th>Onboarding Start</th>
                  <th>HubSpot</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardingCorporations.map((corp) => (
                  <tr key={corp.corporation_name}>
                    <td style={{ fontWeight: 500 }}>{corp.corporation_name}</td>
                    <td>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full`} style={{
                        backgroundColor: (STATUS_COLORS[corp.task_status_label] || '#64748b') + '20',
                        color: STATUS_COLORS[corp.task_status_label] || '#64748b',
                      }}>
                        {corp.task_status_label}
                      </span>
                    </td>
                    <td>{corp.product_mix}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-primary-sans)' }}>{corp.total_facilities}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-primary-sans)' }}>{corp.facilities_in_dh}</td>
                    <td>{corp.go_live_date ? new Date(corp.go_live_date).toLocaleDateString('en-US') : '—'}</td>
                    <td>{corp.onboarding_start_date ? new Date(corp.onboarding_start_date).toLocaleDateString('en-US') : '—'}</td>
                    <td>
                      {corp.hubspot_url && (
                        <a href={corp.hubspot_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>View</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Onboarding: Facilities (subtask level) */}
        {data.onboardingFacilities.length > 0 && (
          <div className="card overflow-hidden">
            <h3 className="text-lg font-semibold mb-1">Onboarding Pipeline (Facilities)</h3>
            <p className="text-sm mb-4">Individual facility-level tasks still in implementation or onboarding.</p>
            <div className="overflow-x-auto">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Corporation</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Facilities</th>
                    <th>Go-Live</th>
                    <th>HubSpot</th>
                  </tr>
                </thead>
                <tbody>
                  {data.onboardingFacilities.map((fac) => (
                    <tr key={fac.corporation_name}>
                      <td style={{ fontWeight: 500 }}>{fac.corporation_name}</td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full`} style={{
                          backgroundColor: (STATUS_COLORS[fac.task_status_label] || '#64748b') + '20',
                          color: STATUS_COLORS[fac.task_status_label] || '#64748b',
                        }}>
                          {fac.task_status_label}
                        </span>
                      </td>
                      <td>{fac.product_mix}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-primary-sans)' }}>{fac.total_facilities}</td>
                      <td>{fac.go_live_date ? new Date(fac.go_live_date).toLocaleDateString('en-US') : '—'}</td>
                      <td>
                        {fac.hubspot_url && (
                          <a href={fac.hubspot_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>View</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CSAT Data Table */}
        <div className="card overflow-hidden mt-8">
          <h3 className="text-lg font-semibold mb-4">CSAT Periodic Breakdown ({filteredCsat.length} periods)</h3>
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Positive</th>
                  <th style={{ textAlign: 'right' }}>Negative</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>CSAT %</th>
                </tr>
              </thead>
              <tbody>
                {filteredCsat.map((row) => (
                  <tr key={row.period_label}>
                    <td style={{ fontWeight: 500 }}>{row.period_label}</td>
                    <td style={{ textAlign: 'right', color: '#3B7E6B', fontFamily: 'var(--font-primary-sans)' }}>{row.csat_positive}</td>
                    <td style={{ textAlign: 'right', color: '#F47C44', fontFamily: 'var(--font-primary-sans)' }}>{row.csat_negative}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-primary-sans)' }}>{row.csat_total}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500, fontFamily: 'var(--font-primary-sans)' }}>{row.csat_score_pct != null ? Math.round(row.csat_score_pct) + '%' : '—'}</td>
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
