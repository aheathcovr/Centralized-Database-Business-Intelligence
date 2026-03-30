import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0844868008',
});

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
  return rows as SupportMetrics[];
}
