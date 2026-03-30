'use client';

import { useState, useCallback, useEffect } from 'react';
import type { DatePeriod, DateRange } from './types';

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  className?: string;
}

const PERIODS: { value: DatePeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getStartOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

function getEndOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3 + 3, 0);
}

function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function getEndOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

function formatISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function computeDateRange(period: DatePeriod): DateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'monthly':
      startDate = getStartOfMonth(now);
      endDate = getEndOfMonth(now);
      break;
    case 'quarterly':
      startDate = getStartOfQuarter(now);
      endDate = getEndOfQuarter(now);
      break;
    case 'yearly':
      startDate = getStartOfYear(now);
      endDate = getEndOfYear(now);
      break;
  }

  return {
    startDate: formatISO(startDate),
    endDate: formatISO(endDate),
    period,
  };
}

function navigatePeriod(range: DateRange, direction: 'prev' | 'next'): DateRange {
  const current = new Date(range.startDate);
  const offset = direction === 'next' ? 1 : -1;

  let newDate: Date;
  switch (range.period) {
    case 'monthly':
      newDate = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      return {
        startDate: formatISO(getStartOfMonth(newDate)),
        endDate: formatISO(getEndOfMonth(newDate)),
        period: 'monthly',
      };
    case 'quarterly':
      newDate = new Date(current.getFullYear(), current.getMonth() + offset * 3, 1);
      return {
        startDate: formatISO(getStartOfQuarter(newDate)),
        endDate: formatISO(getEndOfQuarter(newDate)),
        period: 'quarterly',
      };
    case 'yearly':
      newDate = new Date(current.getFullYear() + offset, 0, 1);
      return {
        startDate: formatISO(getStartOfYear(newDate)),
        endDate: formatISO(getEndOfYear(newDate)),
        period: 'yearly',
      };
  }
}

function getRangeDisplayLabel(range: DateRange): string {
  const start = new Date(range.startDate + 'T00:00:00');

  switch (range.period) {
    case 'monthly':
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case 'quarterly': {
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      return `Q${quarter} ${start.getFullYear()}`;
    }
    case 'yearly':
      return start.getFullYear().toString();
  }
}

export default function DateRangePicker({
  value,
  onChange,
  className = '',
}: DateRangePickerProps) {
  const [activePeriod, setActivePeriod] = useState<DatePeriod>('monthly');
  const [isCustom, setIsCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handlePeriodChange = useCallback(
    (period: DatePeriod) => {
      setActivePeriod(period);
      setIsCustom(false);
      const range = computeDateRange(period);
      onChange(range);
    },
    [onChange]
  );

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (!value) return;
      const newRange = navigatePeriod(value, direction);
      onChange(newRange);
    },
    [value, onChange]
  );

  const handleClear = useCallback(() => {
    setIsCustom(false);
    setCustomStart('');
    setCustomEnd('');
    onChange(null);
  }, [onChange]);

  const handleCustomApply = useCallback(() => {
    if (customStart && customEnd) {
      onChange({
        startDate: customStart,
        endDate: customEnd,
        period: 'monthly',
      });
    }
  }, [customStart, customEnd, onChange]);

  useEffect(() => {
    if (!value) {
      onChange(computeDateRange('monthly'));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className}>
      <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
        Date Range
      </label>

      <div className="flex gap-1 mb-2">
        {PERIODS.map(({ value: period, label }) => (
          <button
            key={period}
            type="button"
            onClick={() => handlePeriodChange(period)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer ${
              activePeriod === period && !isCustom
                ? 'bg-covr-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsCustom(!isCustom)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer ${
            isCustom
              ? 'bg-covr-blue text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">From</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="filter-select text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">To</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="filter-select text-xs"
            />
          </div>
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="btn-primary text-xs py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNavigate('prev')}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            aria-label="Previous period"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            {value ? (
              <span className="text-sm font-medium text-gray-900">
                {getRangeDisplayLabel(value)}
              </span>
            ) : (
              <span className="text-sm text-gray-400">All time</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('next')}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            aria-label="Next period"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {value && !isCustom && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formatDateDisplay(new Date(value.startDate + 'T00:00:00'))} — {formatDateDisplay(new Date(value.endDate + 'T00:00:00'))}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-covr-blue hover:underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
