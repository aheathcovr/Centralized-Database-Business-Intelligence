'use client';

import { useQuery } from '@/lib/hooks';
import KpiCard from '@/components/KpiCard';

interface ExecutivePulseRow {
  owner_id: string;
  owner_full_name: string;
  global_asp_ytd: number;
  won_revenue_this_week: number;
  won_deals_this_week: number;
  opps_created_this_week: number;
  _loaded_at: string;
}

interface ExecutivePulseProps {
  ownerId?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export default function ExecutivePulse({ ownerId }: ExecutivePulseProps) {
  const { data, loading, error, refetch } = useQuery<{ data: ExecutivePulseRow[] }>(
    `executive-pulse-${ownerId || 'global'}`,
    async () => {
      const params = new URLSearchParams();
      if (ownerId) {
        params.set('owner_id', ownerId);
      }
      const qs = params.toString();
      const url = '/api/command-center/executive-pulse' + (qs ? `?${qs}` : '');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    }
  );

  // Get the global row (first row with owner_id = 'GLOBAL')
  const globalData = data?.data?.find(row => row.owner_id === 'GLOBAL');

  if (loading && !globalData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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
          Failed to load executive pulse data
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

  if (!globalData) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard
        label="YTD Average Deal Size"
        value={formatCurrency(globalData.global_asp_ytd)}
        color="#1570B6"
        subtext="Closed won deals"
      />
      <KpiCard
        label="Won Revenue This Week"
        value={formatCurrency(globalData.won_revenue_this_week)}
        color="#3B7E6B"
        subtext={`${globalData.won_deals_this_week} deal${globalData.won_deals_this_week !== 1 ? 's' : ''}`}
      />
      <KpiCard
        label="Won Deals This Week"
        value={globalData.won_deals_this_week.toLocaleString()}
        color="#26A2DC"
        subtext="Closed won"
      />
      <KpiCard
        label="Opps Created This Week"
        value={globalData.opps_created_this_week.toLocaleString()}
        color="#A67FB9"
        subtext="New opportunities"
      />
    </div>
  );
}