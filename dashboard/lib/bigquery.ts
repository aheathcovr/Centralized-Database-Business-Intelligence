import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0844868008',
});


// BigQuery returns DATE fields as BigQueryDate objects with {value: "YYYY-MM-DD"} structure.
// This helper extracts the ISO date string for JSON serialization.
function bqDateToString(val: unknown): string {
  if (val && typeof val === "object" && "value" in val) {
    return (val as { value: string }).value;
  }
  return String(val);
}
export interface CorporationData {
  clickup_task_id: string;
  corporation_name: string;
  task_status: string;
  task_status_label: string;
  customer_type_label: string | null;
  customer_type_value: string | null;
  hubspot_url: string | null;
  hubspot_company_id: string | null;
  total_facilities: number;
  facilities_in_dh: number;
  facilities_matched: number;
  penetration_rate: number;
  product_mix: string;
  has_flow: boolean;
  has_view: boolean;
  has_sync: boolean;
  total_facilities_override: number | null;
  billing_stop_date: string | null;
  go_live_date: string | null;
  onboarding_start_date: string | null;
  task_created_timestamp: string | null;
  task_updated_timestamp: string | null;
  _loaded_at: string;
}

export interface TaskStatusSummary {
  task_status: string;
  task_status_label: string;
  count: number;
}

export interface CustomerTypeSummary {
  customer_type_label: string | null;
  count: number;
}

export interface ProductMixSummary {
  product_mix: string;
  count: number;
}

export interface ServicesBreakdown {
  service_name: string;
  product: string;
  count: number;
}

export async function getCorporationsData(): Promise<CorporationData[]> {
  const query = `
    SELECT
      clickup_task_id,
      corporation_name,
      task_status,
      task_status_label,
      customer_type_label,
      customer_type_value,
      hubspot_url,
      hubspot_company_id,
      total_facilities,
      facilities_in_dh,
      facilities_matched,
      penetration_rate,
      product_mix,
      has_flow,
      has_view,
      has_sync,
      total_facilities_override,
      billing_stop_date,
      go_live_date,
      onboarding_start_date,
      task_created_timestamp,
      task_updated_timestamp,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    ORDER BY penetration_rate DESC, corporation_name
  `;

  const [rows] = await bigquery.query({ query });
  return rows as CorporationData[];
}

export async function getCorporationById(clickupTaskId: string): Promise<CorporationData | null> {
  const query = `
    SELECT
      clickup_task_id,
      corporation_name,
      task_status,
      task_status_label,
      customer_type_label,
      customer_type_value,
      hubspot_url,
      hubspot_company_id,
      total_facilities,
      facilities_in_dh,
      facilities_matched,
      penetration_rate,
      product_mix,
      has_flow,
      has_view,
      has_sync,
      total_facilities_override,
      billing_stop_date,
      go_live_date,
      onboarding_start_date,
      task_created_timestamp,
      task_updated_timestamp,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    WHERE clickup_task_id = @clickup_task_id
    LIMIT 1
  `;

  const [rows] = await bigquery.query({
    query,
    params: { clickup_task_id: clickupTaskId },
  });

  return rows.length > 0 ? (rows[0] as CorporationData) : null;
}

// Summary stats by Task Status (ClickUp status)
export async function getTaskStatusSummary(): Promise<TaskStatusSummary[]> {
  const query = `
    SELECT
      task_status,
      task_status_label,
      COUNT(*) as count
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    GROUP BY task_status, task_status_label
    ORDER BY count DESC
  `;

  const [rows] = await bigquery.query({ query });
  return rows as TaskStatusSummary[];
}

// Summary stats by Customer Type
export async function getCustomerTypeSummary(): Promise<CustomerTypeSummary[]> {
  const query = `
    SELECT
      customer_type_label,
      COUNT(*) as count
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    GROUP BY customer_type_label
    ORDER BY count DESC
  `;

  const [rows] = await bigquery.query({ query });
  return rows as CustomerTypeSummary[];
}

// Summary stats by Product Mix
export async function getProductMixSummary(): Promise<ProductMixSummary[]> {
  const query = `
    SELECT
      product_mix,
      COUNT(*) as count
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    GROUP BY product_mix
    ORDER BY count DESC
  `;

  const [rows] = await bigquery.query({ query });
  return rows as ProductMixSummary[];
}

// Corporations by billing status (has billing stop date or not)
export async function getBillingStatusCounts() {
  const query = `
    SELECT
      COUNT(*) as total_corporations,
      COUNTIF(billing_stop_date IS NOT NULL) as has_billing_stop,
      COUNTIF(billing_stop_date IS NULL) as no_billing_stop,
      COUNTIF(go_live_date IS NOT NULL) as has_go_live,
      COUNTIF(onboarding_start_date IS NOT NULL) as has_onboarding_start
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
  `;

  const [rows] = await bigquery.query({ query });
  return rows[0];
}

// Overall summary stats
export async function getSummaryStats() {
  const query = `
    SELECT
      COUNT(*) as total_corporations,
      COUNTIF(task_status_label = 'Active') as active_status_count,
      COUNTIF(task_status_label = 'Churned') as churned_status_count,
      COUNTIF(task_status_label = 'Implementation') as implementation_status_count,
      COUNTIF(task_status_label = 'Stalled') as stalled_status_count,
      COUNTIF(task_status_label = 'Offboarding') as offboarding_status_count,
      COUNTIF(product_mix LIKE '%Flow%') as flow_customers,
      COUNTIF(product_mix LIKE '%View%') as view_customers,
      COUNTIF(product_mix LIKE '%Sync%') as sync_customers,
      AVG(penetration_rate) as avg_penetration_rate,
      SUM(total_facilities) as total_facilities,
      SUM(facilities_in_dh) as total_facilities_in_dh,
      -- Facility counts broken down by corporation status
      SUM(IF(task_status_label = 'Active', total_facilities, 0)) as active_facilities,
      SUM(IF(task_status_label = 'Active', facilities_in_dh, 0)) as active_facilities_in_dh,
      SUM(IF(task_status_label = 'Churned', total_facilities, 0)) as churned_facilities,
      SUM(IF(task_status_label = 'Churned', facilities_in_dh, 0)) as churned_facilities_in_dh,
      SUM(IF(task_status_label = 'Implementation', total_facilities, 0)) as implementation_facilities,
      SUM(IF(task_status_label = 'Implementation', facilities_in_dh, 0)) as implementation_facilities_in_dh,
      SUM(IF(task_status_label = 'Stalled', total_facilities, 0)) as stalled_facilities,
      SUM(IF(task_status_label = 'Stalled', facilities_in_dh, 0)) as stalled_facilities_in_dh,
      SUM(IF(task_status_label = 'Offboarding', total_facilities, 0)) as offboarding_facilities,
      SUM(IF(task_status_label = 'Offboarding', facilities_in_dh, 0)) as offboarding_facilities_in_dh,
      MAX(_loaded_at) as data_loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
  `;

  const [rows] = await bigquery.query({ query });
  return rows[0];
}

// Filter corporations by multiple criteria
export async function getFilteredCorporations(filters: {
  taskStatus?: string;
  customerType?: string;
  productMix?: string;
  minPenetration?: number;
  maxPenetration?: number;
}): Promise<CorporationData[]> {
  const whereConditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.taskStatus) {
    whereConditions.push(`task_status_label = @taskStatus`);
    params.taskStatus = filters.taskStatus;
  }
  if (filters.customerType) {
    whereConditions.push(`customer_type_label = @customerType`);
    params.customerType = filters.customerType;
  }
  if (filters.productMix) {
    whereConditions.push(`product_mix LIKE @productMix`);
    params.productMix = `%${filters.productMix}%`;
  }
  if (filters.minPenetration !== undefined) {
    whereConditions.push(`penetration_rate >= @minPenetration`);
    params.minPenetration = filters.minPenetration;
  }
  if (filters.maxPenetration !== undefined) {
    whereConditions.push(`penetration_rate <= @maxPenetration`);
    params.maxPenetration = filters.maxPenetration;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      clickup_task_id,
      corporation_name,
      task_status,
      task_status_label,
      customer_type_label,
      hubspot_url,
      hubspot_company_id,
      total_facilities,
      facilities_in_dh,
      facilities_matched,
      penetration_rate,
      product_mix,
      total_facilities_override,
      billing_stop_date,
      go_live_date,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    ${whereClause}
    ORDER BY penetration_rate DESC, corporation_name
  `;

  const [rows] = await bigquery.query({ query, params });
  return rows as CorporationData[];
}
// Intercom weekly support metrics
export interface SupportMetrics {
  week_start: string;
  year_week: string;
  new_tickets: number;
  closed_tickets: number;
  csat_positive: number;
  csat_negative: number;
  csat_total: number;
  csat_score_pct: number | null;
  first_response_avg_seconds: number | null;
  first_response_median_seconds: number | null;
  first_response_avg_minutes: number | null;
  first_response_median_minutes: number | null;
  first_response_avg_hours: number | null;
  first_response_median_hours: number | null;
}

export async function getSupportMetrics(params?: {
  start_week?: string;
  end_week?: string;
}): Promise<SupportMetrics[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_week) {
    whereConditions.push('week_start >= @start_week');
    queryParams.start_week = params.start_week;
  }
  if (params?.end_week) {
    whereConditions.push('week_start <= @end_week');
    queryParams.end_week = params.end_week;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.intercom_weekly_support_metrics\`
    ${whereClause}
    ORDER BY week_start DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    week_start: bqDateToString(row.week_start),
  })) as SupportMetrics[];
}

// Intercom monthly support metrics
export interface SupportMetricsMonthly {
  month_start: string;
  year_month: string;
  year: number;
  month_number: number;
  new_tickets: number;
  closed_tickets: number;
  csat_positive: number;
  csat_negative: number;
  csat_total: number;
  csat_score_pct: number | null;
  first_response_avg_seconds: number | null;
  first_response_median_seconds: number | null;
  first_response_avg_minutes: number | null;
  first_response_median_minutes: number | null;
  first_response_avg_hours: number | null;
  first_response_median_hours: number | null;
}

export async function getSupportMetricsMonthly(params?: {
  start_month?: string;
  end_month?: string;
}): Promise<SupportMetricsMonthly[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_month) {
    whereConditions.push('month_start >= @start_month');
    queryParams.start_month = params.start_month;
  }
  if (params?.end_month) {
    whereConditions.push('month_start <= @end_month');
    queryParams.end_month = params.end_month;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.intercom_monthly_support_metrics\`
    ${whereClause}
    ORDER BY month_start DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    month_start: bqDateToString(row.month_start),
  })) as SupportMetricsMonthly[];
}

// In-Month Conversion data from revops_analytics.in_month_conversion view
export interface InMonthConversionRow {
  // Metadata
  period_type: 'monthly' | 'quarterly';
  period_start: string;
  period_end: string;
  period_label: string;
  
  // SOM Section - Counts
  expected_count: number;
  won_count: number;
  lost_count: number;
  pushed_count: number;
  
  // SOM Section - Percentages
  pct_won: number | null;
  pct_lost: number | null;
  pct_pushed: number | null;
  
  // SOM Section - ARR
  expected_arr: number;
  won_arr: number;
  lost_arr: number;
  pushed_arr: number;
  pct_won_arr: number | null;
  
  // EOM Section - Counts
  total_won_count: number;
  won_was_expected_count: number;
  won_was_later_month_count: number;
  won_created_in_month_count: number;
  
  // EOM Section - Percentages
  pct_won_was_expected: number | null;
  pct_won_was_later_month: number | null;
  pct_won_created_in_month: number | null;
  
  // EOM Section - ARR
  total_won_arr: number;
  won_was_expected_arr: number;
  won_was_later_month_arr: number;
  won_created_in_month_arr: number;
  
  // Final Metric
  pct_won_vs_entering_expected: number | null;
  
  // Metadata
  _loaded_at: string;
}

export async function getInMonthConversion(params?: {
  start_month?: string;
  end_month?: string;
  deal_owner_id?: string;
  period_type?: 'monthly' | 'quarterly';
}): Promise<InMonthConversionRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_month) {
    whereConditions.push('period_start >= @start_month');
    queryParams.start_month = params.start_month;
  }
  if (params?.end_month) {
    whereConditions.push('period_start <= @end_month');
    queryParams.end_month = params.end_month;
  }
  if (params?.deal_owner_id) {
    whereConditions.push('deal_owner_id = @deal_owner_id');
    queryParams.deal_owner_id = params.deal_owner_id;
  }
  if (params?.period_type) {
    whereConditions.push('period_type = @period_type');
    queryParams.period_type = params.period_type;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.in_month_conversion\`
    ${whereClause}
    ORDER BY period_start ASC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    period_start: bqDateToString(row.period_start),
  })) as InMonthConversionRow[];
}

// ============================================================
// Rep Performance -- from revops_analytics.rep_performance_view
// ============================================================
export interface RepPerformanceRow {
  month_start: string;
  month_label: string;
  owner_id: string;
  owner_full_name: string;
  deals_won: number;
  deals_lost: number;
  deals_entered: number;
  pipeline_won_amount: number;
  pipeline_entered_amount: number;
  avg_deal_size: number;
  win_rate_pct: number | null;
  close_rate_pct: number | null;
  _loaded_at: string;
}

export async function getRepPerformance(params?: {
  start_month?: string;
  end_month?: string;
  owner_id?: string;
}): Promise<RepPerformanceRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_month) {
    whereConditions.push('month_start >= @start_month');
    queryParams.start_month = params.start_month;
  }
  if (params?.end_month) {
    whereConditions.push('month_start <= @end_month');
    queryParams.end_month = params.end_month;
  }
  if (params?.owner_id) {
    whereConditions.push('owner_id = @owner_id');
    queryParams.owner_id = params.owner_id;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.rep_performance_view\`
    ${whereClause}
    ORDER BY month_start ASC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    month_start: bqDateToString(row.month_start),
  })) as RepPerformanceRow[];
}



// ============================================================
// Pipeline Generation -- from revops_analytics.pipeline_generation_view
// ============================================================
export interface PipelineGenerationRow {
  period_start: string;
  period_label: string;
  quarter_start: string;
  quarter_label: string;
  owner_id: string;
  owner_full_name: string;
  period_type: string;
  deals_created: number;
  pipeline_amount: number;
  avg_deal_amount: number;
  meetings_booked: number;
  _loaded_at: string;
}

export async function getPipelineGeneration(params?: {
  start_period?: string;
  end_period?: string;
  owner_id?: string;
  period_type?: 'monthly' | 'quarterly';
}): Promise<PipelineGenerationRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_period) {
    whereConditions.push('period_start >= @start_period');
    queryParams.start_period = params.start_period;
  }
  if (params?.end_period) {
    whereConditions.push('period_start <= @end_period');
    queryParams.end_period = params.end_period;
  }
  if (params?.owner_id) {
    whereConditions.push('owner_id = @owner_id');
    queryParams.owner_id = params.owner_id;
  }
  if (params?.period_type) {
    whereConditions.push('period_type = @period_type');
    queryParams.period_type = params.period_type;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.pipeline_generation_view\`
    ${whereClause}
    ORDER BY period_start ASC, pipeline_amount DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    period_start: bqDateToString(row.period_start),
  })) as PipelineGenerationRow[];
}
// ============================================================
// Pipeline Management Metrics -- from revops_analytics.pipeline_metrics_view
// ============================================================
export interface PipelineMetricsRow {
  group_mode: string;
  group_label: string;
  group_key: string;
  display_name: string;
  trailing_window: string;
  total_deals: number;
  deals_won: number;
  deals_lost: number;
  deals_open: number;
  total_won_amount: number;
  total_pipeline_amount: number;
  close_rate_pct: number | null;
  asp: number | null;
  avg_sales_cycle_days: number | null;
  pipeline_velocity_30d: number | null;
}

export async function getPipelineMetrics(params?: {
  group_mode?: string;
  trailing_window?: string;
}): Promise<PipelineMetricsRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.group_mode) {
    whereConditions.push('group_mode = @group_mode');
    queryParams.group_mode = params.group_mode;
  }
  if (params?.trailing_window) {
    whereConditions.push('trailing_window = @trailing_window');
    queryParams.trailing_window = params.trailing_window;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.pipeline_metrics_view\`
    ${whereClause}
    ORDER BY group_mode, trailing_window, display_name
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows as PipelineMetricsRow[];
}

// ============================================================
// WalletShare -- from revops_analytics.corp_penetration_view
// ============================================================
export interface WalletshareRow {
  clickup_task_id: string;
  corporation_name: string;
  task_status_label: string;
  customer_type_label: string | null;
  product_mix: string;
  total_facilities: number;
  facilities_in_dh: number;
  penetration_rate: number;
  active_facilities: number;
  walletshare_pct: number;
  active_flow_only_facilities: number;
  active_view_only_facilities: number;
  active_flow_and_view_facilities: number;
  active_sync_facilities: number;
  win_back_facilities: number;
  no_start_facilities: number;
  stalled_facilities: number;
  untapped_dh_only_facilities: number;
  total_opportunity_facilities: number;
  task_created_timestamp: string | null;
  _loaded_at: string;
}

export async function getWalletshare(params?: {
  status?: string;
  product?: string;
}): Promise<WalletshareRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.status) {
    whereConditions.push('task_status_label = @status');
    queryParams.status = params.status;
  }
  if (params?.product) {
    whereConditions.push('product_mix = @product');
    queryParams.product = params.product;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      clickup_task_id,
      corporation_name,
      task_status_label,
      customer_type_label,
      product_mix,
      total_facilities,
      facilities_in_dh,
      penetration_rate,
      active_facilities,
      walletshare_pct,
      active_flow_only_facilities,
      active_view_only_facilities,
      active_flow_and_view_facilities,
      active_sync_facilities,
      win_back_facilities,
      no_start_facilities,
      stalled_facilities,
      untapped_dh_only_facilities,
      total_opportunity_facilities,
      task_created_timestamp,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    ${whereClause}
    ORDER BY walletshare_pct DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows as WalletshareRow[];
}

// ============================================================
// Customer Success -- CSAT & NPS by period, domain, onboarding
// ============================================================

export interface CsPeriodRow {
  period_start: string;
  period_type: string;
  period_label: string;
  csat_positive: number;
  csat_negative: number;
  csat_total: number;
  csat_score_pct: number | null;
}

export interface NpsPeriodRow {
  period_start: string;
  period_type: string;
  period_label: string;
  total_responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps_score: number | null;
}

export interface CsDomainRow {
  domain: string;
  total_ratings: number;
  csat_positive: number;
  csat_negative: number;
  csat_score_pct: number | null;
}

export async function getCsatPeriodic(): Promise<CsPeriodRow[]> {
  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.csat_monthly_quarterly\`
    ORDER BY period_type, period_start DESC
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    period_start: bqDateToString(row.period_start),
  })) as CsPeriodRow[];
}

export async function getNpsPeriodic(): Promise<NpsPeriodRow[]> {
  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.nps_monthly_quarterly\`
    ORDER BY period_type, period_start DESC
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return rows.map((row: any) => ({
      ...row,
      period_start: bqDateToString(row.period_start),
    })) as NpsPeriodRow[];
  } catch {
    return [];
  }
}

export async function getCsatByDomain(): Promise<CsDomainRow[]> {
  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.csat_by_domain\`
    ORDER BY total_ratings DESC
    LIMIT 50
  `;

  const [rows] = await bigquery.query({ query });
  return rows as CsDomainRow[];
}

export interface OnboardingCorporation {
  corporation_name: string;
  task_status_label: string;
  total_facilities: number;
  facilities_in_dh: number;
  go_live_date: string | null;
  onboarding_start_date: string | null;
  hubspot_url: string | null;
  product_mix: string;
}

export async function getOnboardingCorporations(): Promise<OnboardingCorporation[]> {
  const query = `
    SELECT
      corporation_name,
      task_status_label,
      total_facilities,
      facilities_in_dh,
      go_live_date,
      onboarding_start_date,
      hubspot_url,
      product_mix
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    WHERE task_status_label IN ('Implementation', 'Stalled')
      AND (go_live_date IS NULL OR go_live_date > CURRENT_TIMESTAMP())
    ORDER BY
      CASE task_status_label
        WHEN 'Implementation' THEN 0
        WHEN 'Stalled' THEN 1
        ELSE 2
      END,
      corporation_name
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    go_live_date: row.go_live_date ? bqDateToString(row.go_live_date) : null,
    onboarding_start_date: row.onboarding_start_date ? bqDateToString(row.onboarding_start_date) : null,
  })) as OnboardingCorporation[];
}

export async function getOnboardingFacilities(): Promise<OnboardingCorporation[]> {
  const query = `
    SELECT
      corporation_name,
      task_status_label,
      total_facilities,
      facilities_in_dh,
      go_live_date,
      onboarding_start_date,
      hubspot_url,
      product_mix
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    WHERE task_status_label = 'Active'
      AND go_live_date IS NOT NULL
      AND go_live_date > CURRENT_TIMESTAMP()
    ORDER BY go_live_date ASC, corporation_name
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    go_live_date: row.go_live_date ? bqDateToString(row.go_live_date) : null,
    onboarding_start_date: row.onboarding_start_date ? bqDateToString(row.onboarding_start_date) : null,
  })) as OnboardingCorporation[];
}

export interface CustomerSuccessSummary {
  totalCsatResponses: number;
  avgCsatScore: number | null;
  totalNpsResponses: number;
  avgNpsScore: number | null;
  inImplementation: number;
  inOnboarding: number;
  stalledCount: number;
  activeCount: number;
}

export async function getCustomerSuccessSummary(): Promise<CustomerSuccessSummary> {
  const query = `
    SELECT
      COUNT(*) as total_corps,
      COUNTIF(task_status_label = 'Active') as active_count,
      COUNTIF(task_status_label = 'Implementation') as implementation_count,
      COUNTIF(task_status_label = 'Stalled') as stalled_count,
      COUNTIF(
        task_status_label = 'Active'
        AND go_live_date IS NOT NULL
        AND go_live_date > CURRENT_TIMESTAMP()
      ) as onboarding_count
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
  `;

  const [rows] = await bigquery.query({ query });
  const r = rows[0] || {};

  return {
    totalCsatResponses: 0,
    avgCsatScore: null,
    totalNpsResponses: 0,
    avgNpsScore: null,
    inImplementation: Number(r.implementation_count) || 0,
    inOnboarding: Number(r.onboarding_count) || 0,
    stalledCount: Number(r.stalled_count) || 0,
    activeCount: Number(r.active_count) || 0,
  };
}

// ============================================================
// Executive Pulse -- from revops_analytics.executive_pulse_view
// ============================================================
export interface ExecutivePulseRow {
  owner_id: string;
  owner_full_name: string;
  global_asp_ytd: number;
  won_revenue_this_week: number;
  won_deals_this_week: number;
  opps_created_this_week: number;
  _loaded_at: string;
}

export async function getExecutivePulse(params?: {
  owner_id?: string;
}): Promise<ExecutivePulseRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.owner_id) {
    whereConditions.push('owner_id = @owner_id');
    queryParams.owner_id = params.owner_id;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      owner_id,
      owner_full_name,
      global_asp_ytd,
      won_revenue_this_week,
      won_deals_this_week,
      opps_created_this_week,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.executive_pulse_view\`
    ${whereClause}
    ORDER BY CASE WHEN owner_id = 'GLOBAL' THEN 0 ELSE 1 END, won_revenue_this_week DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    _loaded_at: bqDateToString(row._loaded_at),
  })) as ExecutivePulseRow[];
}

// ============================================================
// Rep Matrix -- from revops_analytics.rep_matrix_view
// ============================================================
export interface RepMatrixRow {
  owner_id: string;
  owner_name: string;
  total_revenue_past_365: number;
  ytd_asp: number;
  avg_days_to_close: number;
  win_rate_by_create_date: number;
  win_rate_by_close_date: number;
  _loaded_at: string;
}

export async function getRepMatrix(): Promise<RepMatrixRow[]> {
  const query = `
    SELECT
      owner_id,
      owner_name,
      total_revenue_past_365,
      ytd_asp,
      avg_days_to_close,
      win_rate_by_create_date,
      win_rate_by_close_date,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.rep_matrix_view\`
    ORDER BY total_revenue_past_365 DESC
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    _loaded_at: bqDateToString(row._loaded_at),
  })) as RepMatrixRow[];
}

// ============================================================
// Lead Velocity -- from revops_analytics.lead_velocity_view
// ============================================================
export interface LeadVelocityRow {
  period_start: string;
  period_label: string;
  total_leads: number;
  converted_leads: number;
  conversion_rate: number;
  avg_time_to_first_touch_days: number;
  _loaded_at: string;
}

export async function getLeadVelocity(): Promise<LeadVelocityRow[]> {
  const query = `
    SELECT
      period_start,
      period_label,
      total_leads,
      converted_leads,
      conversion_rate,
      avg_time_to_first_touch_days,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.lead_velocity_view\`
    ORDER BY
      CASE period_label
        WHEN 'MTD' THEN 1
        WHEN 'QTD' THEN 2
        WHEN 'YTD' THEN 3
      END
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    period_start: bqDateToString(row.period_start),
    _loaded_at: bqDateToString(row._loaded_at),
  })) as LeadVelocityRow[];
}

// ============================================================
// Funnel Economics -- from revops_analytics.funnel_economics_view
// ============================================================
export interface FunnelEconomicsRow {
  lead_source: string;
  facility_deal_count: number;
  facility_win_rate_pct: number;
  facility_avg_arr: number;
  corporate_deal_count: number;
  corporate_win_rate_pct: number;
  corporate_avg_arr: number;
  total_deal_count: number;
  _loaded_at: string;
}

export async function getFunnelEconomics(): Promise<FunnelEconomicsRow[]> {
  const query = `
    SELECT
      lead_source,
      facility_deal_count,
      facility_win_rate_pct,
      facility_avg_arr,
      corporate_deal_count,
      corporate_win_rate_pct,
      corporate_avg_arr,
      total_deal_count,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.funnel_economics_view\`
    ORDER BY total_deal_count DESC, lead_source
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    _loaded_at: bqDateToString(row._loaded_at),
  })) as FunnelEconomicsRow[];
}

// ============================================================
// Activity Matrix -- from revops_analytics.activity_matrix_view
// ============================================================
export interface ActivityMatrixRow {
  owner_id: string;
  owner_name: string;
  calls_count: number;
  emails_count: number;
  meetings_count: number;
  prospecting_count: number;
  total_activities: number;
  _loaded_at: string;
}

export async function getActivityMatrix(): Promise<ActivityMatrixRow[]> {
  const query = `
    SELECT
      owner_id,
      owner_name,
      calls_count,
      emails_count,
      meetings_count,
      prospecting_count,
      total_activities,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.activity_matrix_view\`
    ORDER BY owner_name, total_activities DESC
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    _loaded_at: bqDateToString(row._loaded_at),
  })) as ActivityMatrixRow[];
}

// ============================================================
// Pipeline Shed (Leakage) -- from revops_analytics.pipeline_shed_view
// ============================================================
export interface PipelineShedRow {
  period: string;
  lost_arr: number;
  lost_deal_count: number;
  _loaded_at: string;
}

export async function getPipelineShed(): Promise<PipelineShedRow[]> {
  const query = `
    SELECT
      period,
      lost_arr,
      lost_deal_count,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.pipeline_shed_view\`
    ORDER BY
      CASE period
        WHEN 'Last Week' THEN 1
        WHEN 'MTD' THEN 2
        WHEN 'QTD' THEN 3
      END
  `;

  const [rows] = await bigquery.query({ query });
  return rows.map((row: any) => ({
    ...row,
    _loaded_at: bqDateToString(row._loaded_at),
  })) as PipelineShedRow[];
}

// ============================================================
// ARR Won YTD -- from revops_analytics.arr_won_ytd_view
// ============================================================
export interface ArrWonYtdRow {
  period_start: string;
  period_label: string;
  period_type: 'monthly' | 'quarterly';
  deal_owner_name: string;
  arr_won: number;
  deals_won_count: number;
  _loaded_at: string;
}

export async function getArrWonYtd(params?: {
  start_period?: string;
  end_period?: string;
  deal_owner_name?: string;
  period_type?: 'monthly' | 'quarterly';
}): Promise<ArrWonYtdRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_period) {
    whereConditions.push('period_start >= @start_period');
    queryParams.start_period = params.start_period;
  }
  if (params?.end_period) {
    whereConditions.push('period_start <= @end_period');
    queryParams.end_period = params.end_period;
  }
  if (params?.deal_owner_name) {
    whereConditions.push('deal_owner_name = @deal_owner_name');
    queryParams.deal_owner_name = params.deal_owner_name;
  }
  if (params?.period_type) {
    whereConditions.push('period_type = @period_type');
    queryParams.period_type = params.period_type;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.arr_won_ytd_view\`
    ${whereClause}
    ORDER BY period_start DESC, period_type, deal_owner_name
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    period_start: bqDateToString(row.period_start),
  })) as ArrWonYtdRow[];
}

// ============================================================
// Bookings vs Goal -- from revops_analytics.bookings_vs_goal_view
// ============================================================
export interface BookingsVsGoalRow {
  owner_name: string;
  period_type: 'annual' | 'quarterly';
  current_period: string;
  goal_arr: number;
  actual_arr: number;
  attainment_pct: number | null;
}

export async function getBookingsVsGoal(params?: {
  owner_name?: string;
  period_type?: 'annual' | 'quarterly';
  current_period?: string;
}): Promise<BookingsVsGoalRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.owner_name) {
    whereConditions.push('owner_name = @owner_name');
    queryParams.owner_name = params.owner_name;
  }
  if (params?.period_type) {
    whereConditions.push('period_type = @period_type');
    queryParams.period_type = params.period_type;
  }
  if (params?.current_period) {
    whereConditions.push('current_period = @current_period');
    queryParams.current_period = params.current_period;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.bookings_vs_goal_view\`
    ${whereClause}
    ORDER BY current_period DESC, period_type, owner_name
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows as BookingsVsGoalRow[];
}

// ============================================================
// Deals Won Lost Added -- from revops_analytics.deals_won_lost_added_view
// ============================================================
export interface DealsWonLostAddedRow {
  month_start: string;
  month_label: string;
  deals_won_count: number;
  deals_lost_count: number;
  deals_nurtured_count: number;
  deals_added_count: number;
  arr_won: number;
  arr_lost: number;
  arr_added: number;
  _loaded_at: string;
}

export async function getDealsWonLostAdded(params?: {
  start_month?: string;
  end_month?: string;
}): Promise<DealsWonLostAddedRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_month) {
    whereConditions.push('month_start >= @start_month');
    queryParams.start_month = params.start_month;
  }
  if (params?.end_month) {
    whereConditions.push('month_start <= @end_month');
    queryParams.end_month = params.end_month;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.deals_won_lost_added_view\`
    ${whereClause}
    ORDER BY month_start DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    month_start: bqDateToString(row.month_start),
  })) as DealsWonLostAddedRow[];
}

// ============================================================
// Weekly Opps -- from revops_analytics.weekly_opps_view
// ============================================================
export interface WeeklyOppsRow {
  week_start: string;
  week_label: string;
  owner_name: string;
  opps_added_count: number;
  arr_added: number;
  opps_type: string;
}

export async function getWeeklyOpps(params?: {
  start_week?: string;
  end_week?: string;
  owner_name?: string;
  opps_type?: string;
}): Promise<WeeklyOppsRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_week) {
    whereConditions.push('week_start >= @start_week');
    queryParams.start_week = params.start_week;
  }
  if (params?.end_week) {
    whereConditions.push('week_start <= @end_week');
    queryParams.end_week = params.end_week;
  }
  if (params?.owner_name) {
    whereConditions.push('owner_name = @owner_name');
    queryParams.owner_name = params.owner_name;
  }
  if (params?.opps_type) {
    whereConditions.push('opps_type = @opps_type');
    queryParams.opps_type = params.opps_type;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.weekly_opps_view\`
    ${whereClause}
    ORDER BY week_start DESC, owner_name, opps_type
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    week_start: bqDateToString(row.week_start),
  })) as WeeklyOppsRow[];
}

// ============================================================
// Forecast Category Pipeline -- from revops_analytics.forecast_category_pipeline_view
// ============================================================
export interface ForecastCategoryPipelineRow {
  forecast_category: string;
  owner_name: string | null;
  quarter: string | null;
  deals_count: number;
  total_arr: number;
  closedate: string | null;
}

export async function getForecastCategoryPipeline(params?: {
  quarter?: string;
  owner_name?: string;
  forecast_category?: string;
}): Promise<ForecastCategoryPipelineRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.quarter) {
    whereConditions.push('quarter = @quarter');
    queryParams.quarter = params.quarter;
  }
  if (params?.owner_name) {
    whereConditions.push('owner_name = @owner_name');
    queryParams.owner_name = params.owner_name;
  }
  if (params?.forecast_category) {
    whereConditions.push('forecast_category = @forecast_category');
    queryParams.forecast_category = params.forecast_category;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.forecast_category_pipeline_view\`
    ${whereClause}
    ORDER BY quarter DESC, owner_name, forecast_category
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    closedate: row.closedate ? bqDateToString(row.closedate) : null,
  })) as ForecastCategoryPipelineRow[];
}

// ============================================================
// Largest Open Opps -- from revops_analytics.largest_open_opps_view
// ============================================================
export interface LargestOpenOppsRow {
  deal_id: string;
  deal_name: string;
  owner_name: string;
  amount: number;
  closedate: string;
  forecast_category: string;
  stage_name: string;
  quarter: string;
  _loaded_at: string;
}

export async function getLargestOpenOpps(params?: {
  quarter?: string;
  owner_name?: string;
  limit?: number;
}): Promise<LargestOpenOppsRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string | number> = {};

  if (params?.quarter) {
    whereConditions.push('quarter = @quarter');
    queryParams.quarter = params.quarter;
  }
  if (params?.owner_name) {
    whereConditions.push('owner_name = @owner_name');
    queryParams.owner_name = params.owner_name;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const limitClause = params?.limit ? `LIMIT ${params.limit}` : 'LIMIT 50';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.largest_open_opps_view\`
    ${whereClause}
    ORDER BY amount DESC
    ${limitClause}
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    closedate: bqDateToString(row.closedate),
    _loaded_at: bqDateToString(row._loaded_at),
  })) as LargestOpenOppsRow[];
}

// ============================================================
// AE Outbound Pipeline -- from revops_analytics.ae_outbound_pipeline_view
// ============================================================
export interface AeOutboundPipelineRow {
  week_start: string;
  week_label: string;
  owner_name: string;
  outbound_opps_count: number;
  outbound_arr: number;
}

export async function getAeOutboundPipeline(params?: {
  start_week?: string;
  end_week?: string;
  owner_name?: string;
}): Promise<AeOutboundPipelineRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_week) {
    whereConditions.push('week_start >= @start_week');
    queryParams.start_week = params.start_week;
  }
  if (params?.end_week) {
    whereConditions.push('week_start <= @end_week');
    queryParams.end_week = params.end_week;
  }
  if (params?.owner_name) {
    whereConditions.push('owner_name = @owner_name');
    queryParams.owner_name = params.owner_name;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.ae_outbound_pipeline_view\`
    ${whereClause}
    ORDER BY week_start DESC, owner_name
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    week_start: bqDateToString(row.week_start),
  })) as AeOutboundPipelineRow[];
}

// ============================================================
// Deals to Address -- from revops_analytics.deals_to_address_view
// ============================================================
export interface DealsToAddressRow {
  deal_id: string;
  deal_name: string;
  owner_name: string;
  amount: number;
  closedate: string;
  days_past_close: number;
  stage_name: string;
  notes: string | null;
  _loaded_at: string;
}

export async function getDealsToAddress(params?: {
  owner_name?: string;
  min_days_past_close?: number;
}): Promise<DealsToAddressRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string | number> = {};

  if (params?.owner_name) {
    whereConditions.push('owner_name = @owner_name');
    queryParams.owner_name = params.owner_name;
  }
  if (params?.min_days_past_close !== undefined) {
    whereConditions.push('days_past_close >= @min_days_past_close');
    queryParams.min_days_past_close = params.min_days_past_close;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.deals_to_address_view\`
    ${whereClause}
    ORDER BY days_past_close DESC, amount DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    closedate: bqDateToString(row.closedate),
    _loaded_at: bqDateToString(row._loaded_at),
  })) as DealsToAddressRow[];
}

// ============================================================
// Account Penetration (Covr Singles) -- from revops_analytics.account_penetration_view
// ============================================================
export interface AccountPenetrationRow {
  month_start: string;
  month_label: string;
  parent_company_name: string;
  deals_won_count: number;
  _loaded_at: string;
}

export async function getAccountPenetration(params?: {
  start_month?: string;
  end_month?: string;
}): Promise<AccountPenetrationRow[]> {
  const whereConditions: string[] = [];
  const queryParams: Record<string, string> = {};

  if (params?.start_month) {
    whereConditions.push('month_start >= @start_month');
    queryParams.start_month = params.start_month;
  }
  if (params?.end_month) {
    whereConditions.push('month_start <= @end_month');
    queryParams.end_month = params.end_month;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT
      month_start,
      month_label,
      parent_company_name,
      deals_won_count,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.account_penetration_view\`
    ${whereClause}
    ORDER BY month_start DESC, deals_won_count DESC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    month_start: bqDateToString(row.month_start),
    _loaded_at: bqDateToString(row._loaded_at),
  })) as AccountPenetrationRow[];
}

