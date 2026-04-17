'use client';

import DateRangePicker from '@/components/filters/DateRangePicker';
import SalesRepFilter from '@/components/filters/SalesRepFilter';
import type { DateRange, SalesRepFilterValue } from '@/components/filters/types';

interface CommandCenterFilterBarProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  salesRepFilter: SalesRepFilterValue;
  onSalesRepChange: (value: SalesRepFilterValue) => void;
}

export default function CommandCenterFilterBar({
  dateRange,
  onDateRangeChange,
  salesRepFilter,
  onSalesRepChange,
}: CommandCenterFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-6 mb-6 p-4 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
      <div className="flex-shrink-0 min-w-[200px]">
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      </div>
      <div className="flex-shrink-0 min-w-[280px]">
        <SalesRepFilter value={salesRepFilter} onChange={onSalesRepChange} />
      </div>
    </div>
  );
}