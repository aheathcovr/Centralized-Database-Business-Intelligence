export type DatePeriod = 'monthly' | 'quarterly' | 'yearly';

export interface DateRange {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  period: DatePeriod;
}

export interface SalesRepFilterValue {
  reps: string[];
  groups: string[];
}

export interface DashboardFilters {
  dateRange: DateRange | null;
  salesRep: SalesRepFilterValue;
  taskStatus: string;
  product: string;
  searchQuery: string;
}
