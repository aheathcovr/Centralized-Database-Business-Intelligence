import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0844868008',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const product = searchParams.get('product');

  const whereConditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (status) {
    whereConditions.push('task_status_label = @status');
    params.status = status;
  }

  if (product) {
    whereConditions.push('product_mix = @product');
    params.product = product;
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
      _loaded_at
    FROM \`gen-lang-client-0844868008.revops_analytics.corp_penetration_view\`
    ${whereClause}
    ORDER BY walletshare_pct DESC
  `;

  try {
    const [rows] = await bigquery.query({ query, params });
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error fetching walletshare data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch walletshare data' },
      { status: 500 }
    );
  }
}