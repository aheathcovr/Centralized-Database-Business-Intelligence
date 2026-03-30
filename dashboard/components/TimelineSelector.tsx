'use client';

import { useState } from 'react';

export type TimelinePeriod = 'monthly' | 'quarterly' | 'ytd' | 'all';

interface TimelineSelectorProps {
  value: TimelinePeriod;
  onChange: (period: TimelinePeriod) => void;
  className?: string;
}

const TIMELINE_OPTIONS: { value: TimelinePeriod; label: string; description: string }[] = [
  { value: 'monthly', label: 'Monthly', description: 'This month' },
  { value: 'quarterly', label: 'Quarterly', description: 'This quarter' },
  { value: 'ytd', label: 'YTD', description: 'Year to date' },
  { value: 'all', label: 'All Time', description: 'All data' },
];

export default function TimelineSelector({ value, onChange, className = '' }: TimelineSelectorProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleChange = (period: TimelinePeriod) => {
    if (period === value) return;
    setIsTransitioning(true);
    onChange(period);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div className={"flex items-center gap-2 " + className}>
      <span className="text-xs font-medium uppercase tracking-wider mr-2" style={{ color: 'var(--text-muted)' }}>Timeline:</span>
      <div className="inline-flex rounded-lg p-1" style={{ background: 'rgba(148,163,184,0.08)' }}>
        {TIMELINE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            disabled={isTransitioning}
            className="relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out disabled:cursor-not-allowed"
            style={{
              background: value === option.value ? 'var(--bg-elevated)' : 'transparent',
              color: value === option.value ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: value === option.value ? '0 0 12px var(--accent-glow), inset 0 0 8px var(--accent-glow)' : 'none',
              opacity: isTransitioning ? 0.7 : 1,
            }}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
      <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>
        {TIMELINE_OPTIONS.find((o) => o.value === value)?.description}
      </span>
    </div>
  );
}
