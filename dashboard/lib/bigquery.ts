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

// In-Month Conversion data from revops_analytics.in_month_conversion view
export interface InMonthConversionRow {
  month_start: string;
  month_label: string;
  year: number;
  month_number: number;
  entering_expected: number;
  entering_later_month: number;
  entering_total: number;
  won_from_expected: number;
  lost_from_expected: number;
  pushed_from_expected: number;
  won_total: number;
  lost_total: number;
  pushed_total: number;
  no_change_total: number;
  in_month_conversion_pct: number | null;
  win_rate_pct: number | null;
  loss_rate_pct: number | null;
  push_rate_pct: number | null;
  realized_rate_pct: number | null;
  won_amount_expected: number;
  entering_amount_expected: number;
  lost_amount_expected: number;
  pushed_amount_expected: number;
  dollar_conversion_pct: number | null;
  pushed_expected_to_expected: number;
  pushed_expected_to_later: number;
  _loaded_at: string;
}

export async function getInMonthConversion(params?: {
  start_month?: string;
  end_month?: string;
  deal_owner_id?: string;
}): Promise<InMonthConversionRow[]> {
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
  if (params?.deal_owner_id) {
    whereConditions.push('deal_owner_id = @deal_owner_id');
    queryParams.deal_owner_id = params.deal_owner_id;
  }

  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  const query = `
    SELECT *
    FROM \`gen-lang-client-0844868008.revops_analytics.in_month_conversion\`
    ${whereClause}
    ORDER BY month_start ASC
  `;

  const [rows] = await bigquery.query({ query, params: queryParams });
  return rows.map((row: any) => ({
    ...row,
    month_start: bqDateToString(row.month_start),
  })) as InMonthConversionRow[];
}

// ============================================================
// Rep Performance — from revops_analytics.rep_performance_view
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
// Pipeline Management Metrics — from revops_analytics.pipeline_metrics_view
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
// Customer Success — CSAT & NPS by period, domain, onboarding
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

