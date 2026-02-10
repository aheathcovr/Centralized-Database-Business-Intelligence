import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0844868008',
});

export interface CorporationData {
  clickup_task_id: string;
  corporation_name: string;
  task_status: string;
  task_status_label: string;
  customer_status: string;
  customer_type_label: string | null;
  customer_type_value: string | null;
  hubspot_url: string | null;
  hubspot_company_id: string | null;
  total_child_facilities: number | null;
  facilities_with_clickup: number | null;
  penetration_rate: number | null;
  associated_companies_count: number;
  product_mix: string;
  has_flow: boolean;
  has_view: boolean;
  has_sync: boolean;
  total_facilities_override: number | null;
  org_code_json: string | null;
  services_json: string | null;
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
      customer_status,
      customer_type_label,
      customer_type_value,
      hubspot_url,
      hubspot_company_id,
      total_child_facilities,
      facilities_with_clickup,
      penetration_rate,
      associated_companies_count,
      product_mix,
      has_flow,
      has_view,
      has_sync,
      total_facilities_override,
      org_code_json,
      services_json,
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
      customer_status,
      customer_type_label,
      customer_type_value,
      hubspot_url,
      hubspot_company_id,
      total_child_facilities,
      facilities_with_clickup,
      penetration_rate,
      associated_companies_count,
      product_mix,
      has_flow,
      has_view,
      has_sync,
      total_facilities_override,
      org_code_json,
      services_json,
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
      COUNTIF(customer_type_label = 'Active') as active_customer_type,
      COUNTIF(customer_type_label = 'Churned') as churned_customer_type,
      COUNTIF(customer_type_label = 'No Start') as no_start_customer_type,
      COUNTIF(product_mix LIKE '%Flow%') as flow_customers,
      COUNTIF(product_mix LIKE '%View%') as view_customers,
      COUNTIF(product_mix LIKE '%Sync%') as sync_customers,
      AVG(penetration_rate) as avg_penetration_rate,
      SUM(total_child_facilities) as total_facilities,
      SUM(facilities_with_clickup) as total_active_facilities
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
  hasServices?: boolean;
}): Promise<CorporationData[]> {
  let whereConditions: string[] = [];
  
  if (filters.taskStatus) {
    whereConditions.push(`task_status_label = '${filters.taskStatus}'`);
  }
  if (filters.customerType) {
    whereConditions.push(`customer_type_label = '${filters.customerType}'`);
  }
  if (filters.productMix) {
    whereConditions.push(`product_mix LIKE '%${filters.productMix}%'`);
  }
  if (filters.hasServices) {
    whereConditions.push(`services_json IS NOT NULL`);
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
      customer_status,
      customer_type_label,
      hubspot_url,
      hubspot_company_id,
      total_child_facilities,
      facilities_with_clickup,
      penetration_rate,
      associated_companies_count,
      product_mix,
      total_facilities_override,
      org_code_json,
      billing_stop_date,
      go_live_date,
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    ${whereClause}
    ORDER BY penetration_rate DESC, corporation_name
  `;

  const [rows] = await bigquery.query({ query });
  return rows as CorporationData[];
}
