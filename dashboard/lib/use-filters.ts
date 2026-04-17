'use client';

import { useState, useCallback } from 'react';
import type { DateRange, SalesRepFilterValue } from '@/components/filters/types';

/**
 * Hook for managing global filter state in the Command Center dashboard.
 * Provides centralized filter state for date range and sales rep filters.
 */
export function useFilters() {
  // Date range filter state
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Sales rep filter state
  const [salesRepFilter, setSalesRepFilter] = useState<SalesRepFilterValue>({
    reps: [],
    groups: [],
  });

  // Derived owner ID (first selected rep, or undefined if none)
  const selectedOwnerId = salesRepFilter.reps.length > 0 ? salesRepFilter.reps[0] : undefined;

  // Date values for components that need them
  const startDate = dateRange?.startDate;
  const endDate = dateRange?.endDate;

  // Handlers for filter changes
  const handleDateRangeChange = useCallback((range: DateRange | null) => {
    setDateRange(range);
  }, []);

  const handleSalesRepChange = useCallback((value: SalesRepFilterValue) => {
    setSalesRepFilter(value);
  }, []);

  return {
    // Filter values
    dateRange,
    salesRepFilter,
    selectedOwnerId,
    startDate,
    endDate,
    // Change handlers
    handleDateRangeChange,
    handleSalesRepChange,
  };
}