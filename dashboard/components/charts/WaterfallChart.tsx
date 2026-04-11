'use client';


import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

export interface WaterfallDataItem {
  label: string;
  value: number;
  type: 'start' | 'end' | 'positive' | 'negative';
}

interface WaterfallChartProps {
  data: WaterfallDataItem[];
  height?: number;
  currency?: string;
  title?: string;
  description?: string;
  formatValue?: (value: number) => string;
}

function formatCurrency(value: number, currency: string = '$'): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${currency}${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${currency}${(value / 1000).toFixed(0)}K`;
  }
  return `${currency}${value.toFixed(0)}`;
}
function WaterfallTooltip({ active, payload, currency }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as WaterfallDataItem;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      padding: '0.75rem',
      fontSize: '0.8125rem',
    }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        {d.label}
      </p>
      <p style={{ color: d.type === 'positive' ? '#10b981' : d.type === 'negative' ? '#ef4444' : 'var(--text-secondary)' }}>
        {formatCurrency(d.value, currency)}
      </p>
    </div>
  );
}

export default function WaterfallChart({
  data,
  height = 320,
  currency = '$',
  title,
  description,
  formatValue: customFormatter,
}: WaterfallChartProps) {
  const chartData = data.reduce<Array<{
    label: string;
    value: number;
    type: WaterfallDataItem['type'];
    y0: number;
    y: number;
  }>>((acc, item, index) => {
    if (item.type === 'start' || item.type === 'end') {
      acc.push({
        label: item.label,
        value: item.value,
        type: item.type,
        y0: 0,
        y: item.value,
      });
    } else {
      const previousCumulative = acc.reduce((sum, d) => sum + d.value, 0);
      acc.push({
        label: item.label,
        value: item.value,
        type: item.type,
        y0: item.value >= 0 ? previousCumulative : previousCumulative + item.value,
        y: Math.abs(item.value),
      });
    }
    return acc;
  }, []);
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);




  return (
    <div>
      {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
      {description && <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: 'var(--font-fira-sans)', fill: '#94a3b8', fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontFamily: 'var(--font-fira-code)', fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => customFormatter?.(v) ?? formatCurrency(v, currency)}
          />
          <Tooltip content={<WaterfallTooltip currency={currency} />} />
          <Bar dataKey="y" stackId="waterfall" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={
                  entry.type === 'start' || entry.type === 'end'
                    ? '#64748b'
                    : entry.value >= 0
                    ? '#10b981'
                    : '#ef4444'
                }
                fillOpacity={entry.type === 'start' || entry.type === 'end' ? 0.6 : 0.85}
              />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              content={({ x, y, width, value }) => {
                const xNum = Number(x);
                const yNum = Number(y);
                const wNum = Number(width);
                if (!xNum || !yNum || !wNum || wNum < 30) return null;
                const labelValue = Number(value);
                if (Number.isNaN(labelValue)) return null;
                const fn = customFormatter ?? formatCurrency;
                return (
                  <text
                    x={xNum + wNum / 2}
                    y={yNum - 5}
                    textAnchor="middle"
                    style={{ fontFamily: 'var(--font-fira-code)', fontSize: 10, fill: '#94a3b8' }}
                  >
                    {fn(labelValue, currency)}
                  </text>
                );
              }}
            />
          </Bar>
          <ReferenceLine
            y={0}
            stroke="rgba(148,163,184,0.3)"
            strokeDasharray="2 2"
          />
          {totalValue !== 0 && (
            <ReferenceLine
              y={totalValue}
              stroke="#22d3ee"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: `Net: ${formatCurrency(totalValue, currency)}`, position: 'right', fill: '#22d3ee', fontSize: 11 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981', opacity: 0.85 }} />
          Increase
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444', opacity: 0.85 }} />
          Decrease
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#64748b', opacity: 0.6 }} />
          Start/End Total
        </span>
      </div>
    </div>
  );
}
