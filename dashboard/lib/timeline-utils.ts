import { TimelinePeriod } from '@/components/TimelineSelector';

export interface Corporation {
  clickup_task_id: string;
  corporation_name: string;
  task_status: string;
  task_status_label: string;
  customer_type_label: string | null;
  hubspot_url: string | null;
  hubspot_company_id: string | null;
  total_facilities: number;
  facilities_in_dh: number;
  facilities_matched: number;
  penetration_rate: number;
  product_mix: string;
  task_created_timestamp?: string | null;
  go_live_date?: string | null;
  task_updated_timestamp?: string | null;
  billing_stop_date?: string | null;
  onboarding_start_date?: string | null;
  _loaded_at?: string | null;
}

export interface Stats {
  total_corporations: number;
  active_status_count: number;
  churned_status_count: number;
  implementation_status_count: number;
  stalled_status_count: number;
  offboarding_status_count: number;
  flow_customers: number;
  view_customers: number;
  sync_customers: number;
  avg_penetration_rate: number;
  total_facilities: number;
  total_facilities_in_dh: number;
  active_facilities: number;
  active_facilities_in_dh: number;
  churned_facilities: number;
  churned_facilities_in_dh: number;
  implementation_facilities: number;
  implementation_facilities_in_dh: number;
  stalled_facilities: number;
  stalled_facilities_in_dh: number;
  offboarding_facilities: number;
  offboarding_facilities_in_dh: number;
  data_loaded_at: string;
}

/**
 * Get the start date for a given timeline period
 */
export function getTimelineStartDate(period: TimelinePeriod): Date | null {
  if (period === 'all') return null;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  switch (period) {
    case 'monthly':
      // Start of current month
      return new Date(year, month, 1);
    
    case 'quarterly':
      // Start of current quarter
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return new Date(year, quarterStartMonth, 1);
    
    case 'ytd':
      // Start of current year
      return new Date(year, 0, 1);
    
    default:
      return null;
  }
}

/**
 * Get a human-readable label for the timeline period
 */
export function getTimelineLabel(period: TimelinePeriod): string {
  switch (period) {
    case 'monthly':
      return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case 'quarterly':
      const quarter = Math.floor(new Date().getMonth() / 3) + 1;
      return `Q${quarter} ${new Date().getFullYear()}`;
    case 'ytd':
      return `YTD ${new Date().getFullYear()}`;
    case 'all':
      return 'All Time';
  }
}

/**
 * Filter corporations by timeline period based on their creation date
 */
export function filterCorporationsByTimeline(
  corporations: Corporation[],
  period: TimelinePeriod
): Corporation[] {
  if (period === 'all') return corporations;
  
  const startDate = getTimelineStartDate(period);
  if (!startDate) return corporations;
  
  return corporations.filter((corp) => {
    // Use task_created_timestamp as primary filter, fallback to go_live_date
    const dateToCheck = corp.task_created_timestamp || corp.go_live_date;
    if (!dateToCheck) return false;
    
    const corpDate = new Date(dateToCheck);
    return corpDate >= startDate;
  });
}

/**
 * Recalculate statistics from filtered corporations
 */
export function recalculateStatsFromCorporations(
  corporations: Corporation[],
  originalStats: Stats
): Stats {
  if (corporations.length === 0) {
    return {
      ...originalStats,
      total_corporations: 0,
      active_status_count: 0,
      churned_status_count: 0,
      implementation_status_count: 0,
      stalled_status_count: 0,
      offboarding_status_count: 0,
      flow_customers: 0,
      view_customers: 0,
      sync_customers: 0,
      avg_penetration_rate: 0,
      total_facilities: 0,
      total_facilities_in_dh: 0,
      active_facilities: 0,
      active_facilities_in_dh: 0,
      churned_facilities: 0,
      churned_facilities_in_dh: 0,
      implementation_facilities: 0,
      implementation_facilities_in_dh: 0,
      stalled_facilities: 0,
      stalled_facilities_in_dh: 0,
      offboarding_facilities: 0,
      offboarding_facilities_in_dh: 0,
    };
  }

  // Count by status
  const activeCorps = corporations.filter(c => c.task_status_label === 'Active');
  const churnedCorps = corporations.filter(c => c.task_status_label === 'Churned');
  const implementationCorps = corporations.filter(c => c.task_status_label === 'Implementation');
  const stalledCorps = corporations.filter(c => c.task_status_label === 'Stalled');
  const offboardingCorps = corporations.filter(c => c.task_status_label === 'Offboarding');

  // Count by product
  const flowCustomers = corporations.filter(c => c.product_mix.includes('Flow')).length;
  const viewCustomers = corporations.filter(c => c.product_mix.includes('View')).length;
  const syncCustomers = corporations.filter(c => c.product_mix.includes('Sync')).length;

  // Calculate penetration
  const totalPenetration = corporations.reduce((sum, c) => sum + (c.penetration_rate || 0), 0);
  const avgPenetration = totalPenetration / corporations.length;

  // Calculate facilities
  const totalFacilities = corporations.reduce((sum, c) => sum + (c.total_facilities || 0), 0);
  const totalFacilitiesInDh = corporations.reduce((sum, c) => sum + (c.facilities_in_dh || 0), 0);

  // Facilities by status
  const activeFacilities = activeCorps.reduce((sum, c) => sum + (c.total_facilities || 0), 0);
  const activeFacilitiesInDh = activeCorps.reduce((sum, c) => sum + (c.facilities_in_dh || 0), 0);
  const churnedFacilities = churnedCorps.reduce((sum, c) => sum + (c.total_facilities || 0), 0);
  const churnedFacilitiesInDh = churnedCorps.reduce((sum, c) => sum + (c.facilities_in_dh || 0), 0);
  const implementationFacilities = implementationCorps.reduce((sum, c) => sum + (c.total_facilities || 0), 0);
  const implementationFacilitiesInDh = implementationCorps.reduce((sum, c) => sum + (c.facilities_in_dh || 0), 0);
  const stalledFacilities = stalledCorps.reduce((sum, c) => sum + (c.total_facilities || 0), 0);
  const stalledFacilitiesInDh = stalledCorps.reduce((sum, c) => sum + (c.facilities_in_dh || 0), 0);
  const offboardingFacilities = offboardingCorps.reduce((sum, c) => sum + (c.total_facilities || 0), 0);
  const offboardingFacilitiesInDh = offboardingCorps.reduce((sum, c) => sum + (c.facilities_in_dh || 0), 0);

  return {
    ...originalStats,
    total_corporations: corporations.length,
    active_status_count: activeCorps.length,
    churned_status_count: churnedCorps.length,
    implementation_status_count: implementationCorps.length,
    stalled_status_count: stalledCorps.length,
    offboarding_status_count: offboardingCorps.length,
    flow_customers: flowCustomers,
    view_customers: viewCustomers,
    sync_customers: syncCustomers,
    avg_penetration_rate: avgPenetration,
    total_facilities: totalFacilities,
    total_facilities_in_dh: totalFacilitiesInDh,
    active_facilities: activeFacilities,
    active_facilities_in_dh: activeFacilitiesInDh,
    churned_facilities: churnedFacilities,
    churned_facilities_in_dh: churnedFacilitiesInDh,
    implementation_facilities: implementationFacilities,
    implementation_facilities_in_dh: implementationFacilitiesInDh,
    stalled_facilities: stalledFacilities,
    stalled_facilities_in_dh: stalledFacilitiesInDh,
    offboarding_facilities: offboardingFacilities,
    offboarding_facilities_in_dh: offboardingFacilitiesInDh,
  };
}
