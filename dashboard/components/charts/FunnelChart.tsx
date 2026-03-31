'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';

export interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
  height?: number;
  title?: string;
  description?: string;
  showConversion?: boolean;
  formatValue?: (value: number) => string;
}

const DEFAULT_COLORS = ['#22d3ee', '#0891b2', '#059669', '#10b981', '#84cc16', '#8b5cf6', '#6366f1', '#f59e0b'];

function formatDefault(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function FunnelTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as FunnelStage & { conversionFromPrevious: number; conversionFromTop: number };
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      padding: '0.75rem',
      fontSize: '0.8125rem',
      minWidth: '10rem',
    }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{d.label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-muted)' }}>Count</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{d.value.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-muted)' }}>From Previous</span>
          <span className="font-mono" style={{ color: d.conversionFromPrevious > 50 ? '#10b981' : d.conversionFromPrevious > 25 ? '#f59e0b' : '#ef4444' }}>
            {d.conversionFromPrevious.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-muted)' }}>From Top</span>
          <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{d.conversionFromTop.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function FunnelChart({
  data,
  height = 340,
  title,
  description,
  showConversion = true,
  formatValue,
}: FunnelChartProps) {
  const formatter = formatValue ?? formatDefault;
  const firstValue = data[0]?.value ?? 0;

  const chartData = data.map((stage, index) => ({
    ...stage,
    color: stage.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    conversionFromPrevious: index === 0 ? 100 : (stage.value / data[index - 1].value) * 100,
    conversionFromTop: firstValue > 0 ? (stage.value / firstValue) * 100 : 0,
  }));

  return (
    <div>
      {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
      {description && <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontFamily: 'var(--font-fira-code)', fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => formatter(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fontFamily: 'var(--font-fira-sans)', fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip content={<FunnelTooltip />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.85} />
            ))}
            {showConversion && (
              <LabelList
                dataKey="conversionFromPrevious"
                position="right"
                formatter={(v: number) => {
                  if (isNaN(v) || v === Infinity) return '';
                  return `${v.toFixed(0)}%`;
                }}
                style={{ fontFamily: 'var(--font-fira-code)', fontSize: 10, fill: '#94a3b8' }}
              />
            )}
          </Bar>
          {firstValue > 0 && (
            <ReferenceLine
              x={firstValue}
              stroke="rgba(148,163,184,0.2)"
              strokeDasharray="2 2"
              label={{ value: 'Total', position: 'top', fill: '#94a3b8', fontSize: 10 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      {data.length >= 2 && firstValue > 0 && data[data.length - 1].value > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Overall conversion:{' '}
            <span className="font-mono font-semibold" style={{ color: '#10b981' }}>
              {((data[data.length - 1].value / firstValue) * 100).toFixed(1)}%
            </span>
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.length} stages</span>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
        {chartData.map((entry, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.label}: {formatter(entry.value)}
          </span>
        ))}
      </div>
    </div>
  );
}