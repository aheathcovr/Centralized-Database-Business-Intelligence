'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

export interface BulletDataItem {
  label: string;
  actual: number;
  target: number;
  comparative?: number;
  unit?: string;
}

interface BulletChartProps {
  data: BulletDataItem[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
  title?: string;
  description?: string;
  formatValue?: (value: number, unit?: string) => string;
}

function formatDefault(value: number, _unit?: string): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value.toFixed(0)}${_unit ? _unit : ''}`;
}

function BulletTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BulletDataItem }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const achievement = d.target > 0 ? ((d.actual / d.target) * 100).toFixed(1) : 'N/A';
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      padding: '0.75rem',
      fontSize: '0.8125rem',
      maxWidth: '14rem',
    }}>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        {d.label}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-muted)' }}>Actual</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{d.actual.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-muted)' }}>Target</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{d.target.toLocaleString()}</span>
        </div>
        {d.comparative !== undefined && (
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--text-muted)' }}>Previous</span>
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{d.comparative.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Achievement</span>
          <span className="font-mono font-semibold" style={{
            color: Number(achievement) >= 100 ? '#10b981' : Number(achievement) >= 80 ? '#f59e0b' : '#ef4444',
          }}>
            {achievement}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BulletChart({
  data,
  height = 320,
  layout = 'horizontal',
  title,
  description,
  formatValue,
}: BulletChartProps) {
  const formatter = formatValue ?? formatDefault;

  const chartData = data.map(d => ({
    ...d,
    achievement: d.target > 0 ? (d.actual / d.target) * 100 : 0,
    rangePoor: d.target * 0.6,
    rangeFair: d.target * 0.2,
    rangeGood: d.target * 0.2,
  }));

  if (layout === 'vertical') {
    return (
      <div>
        {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
        {description && <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{description}</p>}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} layout="vertical" barGap={0} barCategoryGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontFamily: 'var(--font-fira-code)', fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v: number) => formatter(v)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fontFamily: 'var(--font-fira-sans)', fill: '#94a3b8', fontSize: 12 }}
            />
            <Tooltip content={<BulletTooltip />} />
            <Bar dataKey="rangePoor" stackId="ranges" fill="rgba(239,68,68,0.1)" radius={[0, 0, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="rangeFair" stackId="ranges" fill="rgba(245,158,11,0.15)" radius={[0, 0, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="rangeGood" stackId="ranges" fill="rgba(16,185,129,0.1)" radius={[0, 0, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="actual" radius={[0, 4, 4, 0]} barSize={16} name="Actual">
              {chartData.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={entry.achievement >= 100 ? '#10b981' : entry.achievement >= 80 ? '#f59e0b' : '#22d3ee'}
                />
              ))}
            </Bar>
            {chartData.map((entry, i) => (
              <ReferenceLine
                key={`ref-${i}`}
                x={entry.target}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 justify-center">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
            On Target
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
            Near Target
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#22d3ee' }} />
            Below Target
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-3 h-0.5" style={{ backgroundColor: '#ef4444' }} />
            Target
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
      {description && <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      <div className="space-y-4">
        {chartData.map((entry, i) => {
          const pct = Math.min((entry.actual / entry.target) * 100, 100);
          const barColor = entry.achievement >= 100 ? '#10b981' : entry.achievement >= 80 ? '#f59e0b' : '#22d3ee';
          return (
            <div key={i} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{entry.label}</span>
                <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                  {formatter(entry.actual)} / {formatter(entry.target)}
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Achievement: <span className="font-mono font-semibold" style={{ color: barColor }}>{entry.achievement.toFixed(1)}%</span>
                </span>
                {entry.comparative !== undefined && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Previous: <span className="font-mono">{formatter(entry.comparative)}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 justify-center">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
          On Target (&ge;100%)
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          Near Target (80-99%)
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#22d3ee' }} />
          Below Target ({'\u003C'}80%)
        </span>
      </div>
    </div>
  );
}