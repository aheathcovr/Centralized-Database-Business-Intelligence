'use client';

interface FilterBarProps {
  selectedTimeRange: string;
  onTimeRangeChange: (value: string) => void;
  selectedRep?: string;
  onRepChange?: (value: string) => void;
  reps?: { id: string; name: string }[];
}

const timeRanges = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
];

export default function FilterBar({ selectedTimeRange, onTimeRangeChange, selectedRep, onRepChange, reps }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Time Range:</label>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => onTimeRangeChange(tr.value)}
              className="px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{
                background: selectedTimeRange === tr.value ? 'var(--accent-glow-strong)' : 'transparent',
                color: selectedTimeRange === tr.value ? 'var(--accent)' : 'var(--text-muted)',
                borderRight: '1px solid var(--border-subtle)',
              }}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {reps && onRepChange && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rep:</label>
          <select
            value={selectedRep || 'all'}
            onChange={(e) => onRepChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
