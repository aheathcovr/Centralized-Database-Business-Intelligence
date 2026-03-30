import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
  icon?: ReactNode;
}

export default function KpiCard({ label, value, color = 'covr-blue', subtext, icon }: KpiCardProps) {
  return (
    <div className="card border-l-4" style={{ borderLeftColor: color.startsWith('#') ? color : undefined }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-600">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold font-mono tabular-nums`} style={{ color: color.startsWith('#') ? color : undefined }}>
        {value}
      </p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}
