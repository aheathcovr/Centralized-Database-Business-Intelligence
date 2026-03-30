'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
} from 'recharts';

interface ConversionMetric {
  month: string;
  newLeads: number;
  qualified: number;
  converted: number;
  conversionRate: number;
}

const sampleData: ConversionMetric[] = [
  { month: 'Jan', newLeads: 45, qualified: 32, converted: 18, conversionRate: 40 },
  { month: 'Feb', newLeads: 52, qualified: 38, converted: 22, conversionRate: 42 },
  { month: 'Mar', newLeads: 48, qualified: 35, converted: 25, conversionRate: 52 },
  { month: 'Apr', newLeads: 61, qualified: 44, converted: 30, conversionRate: 49 },
  { month: 'May', newLeads: 55, qualified: 40, converted: 28, conversionRate: 51 },
  { month: 'Jun', newLeads: 67, qualified: 50, converted: 35, conversionRate: 52 },
];

export default function InMonthConversionPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-covr-blue"></div>
      </div>
    );
  }

  const totalLeads = sampleData.reduce((s, d) => s + d.newLeads, 0);
  const totalConverted = sampleData.reduce((s, d) => s + d.converted, 0);
  const avgConversionRate = Math.round((totalConverted / totalLeads) * 100);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">In-Month Conversion</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track lead-to-customer conversion within the current month
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card border-l-4 border-l-covr-blue">
          <p className="text-sm text-gray-600 mb-1">Total Leads</p>
          <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">{totalLeads}</p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="text-sm text-gray-600 mb-1">Converted</p>
          <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">{totalConverted}</p>
        </div>
        <div className="card border-l-4 border-l-covr-teal">
          <p className="text-sm text-gray-600 mb-1">Avg Conversion Rate</p>
          <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">{avgConversionRate}%</p>
        </div>
        <div className="card border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-600 mb-1">Avg Qualified</p>
          <p className="text-3xl font-bold text-purple-600 font-mono tabular-nums">
            {Math.round(sampleData.reduce((s, d) => s + d.qualified, 0) / sampleData.length)}
          </p>
          <p className="text-xs text-gray-400 mt-1">per month</p>
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Monthly Funnel</h3>
          <p className="text-sm text-gray-500 mb-4">Leads, qualified, and converted per month</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontFamily: 'var(--font-fira-sans)' }} />
              <YAxis tick={{ fontFamily: 'var(--font-fira-code)' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="newLeads" name="Leads" fill="#1e40af" radius={[4, 4, 0, 0]} />
              <Bar dataKey="qualified" name="Qualified" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="converted" name="Converted" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Conversion Rate Trend</h3>
          <p className="text-sm text-gray-500 mb-4">Month-over-month conversion rate percentage</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontFamily: 'var(--font-fira-sans)' }} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontFamily: 'var(--font-fira-code)' }}
              />
              <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} />
              <ReferenceLine y={50} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '50% target', position: 'right', fill: '#dc2626', fontSize: 11 }} />
              <Line type="monotone" dataKey="conversionRate" name="Rate" stroke="#1e40af" strokeWidth={2} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Placeholder for future data integration */}
      <div className="card">
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Data Source Pending</h3>
          <p className="text-xs text-gray-400">
            Connect a BigQuery data source for live in-month conversion metrics.
            Sample data shown above for layout demonstration.
          </p>
        </div>
      </div>
    </div>
  );
}
