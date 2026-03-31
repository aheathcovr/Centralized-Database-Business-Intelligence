import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
  icon?: ReactNode;
}

export default function KpiCard({ label, value, color = '#1570B6', subtext, icon }: KpiCardProps) {
  return (
    <div className="card-glow" style={{ borderTopColor: color }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      </div>
      <p className="text-3xl font-bold font-mono tabular-nums" style={{ color: color, fontFamily: 'var(--font-primary-sans)' }}>
        {value}
      </p>
      {subtext && <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{subtext}</p>}
    </div>
  );
}
