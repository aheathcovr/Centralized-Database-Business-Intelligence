'use client';

import { useQuery } from '@/lib/hooks';
import KpiCard from '@/components/KpiCard';

interface LeadVelocityRow {
  period_start: string;
  period_label: string;
  total_leads: number;
  converted_leads: number;
  conversion_rate: number;
  avg_time_to_first_touch_days: number;
  _loaded_at: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDays(value: number): string {
  return `${value.toFixed(1)} days`;
}

export default function LeadVelocityCards() {
  const { data, loading, error, refetch } = useQuery<{ data: LeadVelocityRow[] }>(
    'lead-velocity',
    async () => {
      const url = '/api/command-center/lead-velocity';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    }
  );

  const rows = data?.data || [];

  if (loading && rows.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card-glow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glow" style={{ borderTopColor: '#F47C44' }}>
        <p className="text-sm" style={{ color: '#F47C44' }}>
          Failed to load lead velocity data
        </p>
        <button
          onClick={() => refetch()}
          className="text-xs underline mt-1"
          style={{ color: 'var(--accent)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card-glow">
        <p className="text-sm text-gray-500">No lead velocity data available</p>
      </div>
    );
  }

  // Find MTD data for the cards
  const mtdData = rows.find(row => row.period_label === 'MTD') || rows[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard
        label="Total Leads"
        value={formatNumber(mtdData.total_leads)}
        color="#1570B6"
        subtext={`MTD: ${mtdData.period_label}`}
      />
      <KpiCard
        label="Conversion Rate"
        value={formatPercent(mtdData.conversion_rate)}
        color="#3B7E6B"
        subtext={`${mtdData.converted_leads.toLocaleString()} converted`}
      />
      <KpiCard
        label="Avg Time to First Touch"
        value={formatDays(mtdData.avg_time_to_first_touch_days)}
        color="#A67FB9"
        subtext="Lead response time"
      />
    </div>
  );
}
