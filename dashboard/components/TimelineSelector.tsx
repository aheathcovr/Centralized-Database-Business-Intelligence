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
    
    // Reset transition state after animation completes
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600 mr-2">Timeline:</span>
      <div className="inline-flex rounded-lg bg-gray-100 p-1 shadow-sm">
        {TIMELINE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            disabled={isTransitioning}
            className={`
              relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out
              ${
                value === option.value
                  ? 'bg-white text-covr-blue shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
              ${isTransitioning ? 'opacity-70' : 'opacity-100'}
              disabled:cursor-not-allowed
            `}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-400 ml-2">
        {TIMELINE_OPTIONS.find((o) => o.value === value)?.description}
      </span>
    </div>
  );
}
