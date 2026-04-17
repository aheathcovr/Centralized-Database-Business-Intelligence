'use client';

import { useQuery } from '@/lib/hooks';
import KpiCard from '@/components/KpiCard';

interface PipelineShedRow {
  period: string;
  lost_arr: number;
  lost_deal_count: number;
  _loaded_at: string;
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

export default function PipelineShed() {
  const { data, loading, error, refetch } = useQuery<{ data: PipelineShedRow[] }>(
    'pipeline-shed',
    async () => {
      const url = '/api/command-center/pipeline-shed';
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
          Failed to load pipeline shed data
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
        <p className="text-sm text-gray-500">No pipeline shed data available</p>
      </div>
    );
  }

  // Find data for each period
  const lastWeek = rows.find(row => row.period === 'Last Week');
  const mtd = rows.find(row => row.period === 'MTD');
  const qtd = rows.find(row => row.period === 'QTD');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard
        label="Last Week - Lost ARR"
        value={lastWeek ? formatCurrency(lastWeek.lost_arr) : '$0'}
        color="#F47C44"
        subtext={`${lastWeek?.lost_deal_count || 0} deal${lastWeek?.lost_deal_count !== 1 ? 's' : ''} lost`}
      />
      <KpiCard
        label="MTD - Lost ARR"
        value={mtd ? formatCurrency(mtd.lost_arr) : '$0'}
        color="#E3523A"
        subtext={`${mtd?.lost_deal_count || 0} deal${mtd?.lost_deal_count !== 1 ? 's' : ''} lost`}
      />
      <KpiCard
        label="QTD - Lost ARR"
        value={qtd ? formatCurrency(qtd.lost_arr) : '$0'}
        color="#C4381E"
        subtext={`${qtd?.lost_deal_count || 0} deal${qtd?.lost_deal_count !== 1 ? 's' : ''} lost`}
      />
    </div>
  );
}
