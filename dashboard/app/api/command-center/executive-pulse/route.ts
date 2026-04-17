import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0844868008',
});

export const dynamic = 'force-dynamic';

export interface ExecutivePulseRow {
  owner_id: string;
  owner_full_name: string;
  global_asp_ytd: number;
  won_revenue_this_week: number;
  won_deals_this_week: number;
  opps_created_this_week: number;
  _loaded_at: string;
}

function bqDateToString(val: unknown): string {
  if (val && typeof val === 'object' && 'value' in val) {
    return (val as { value: string }).value;
  }
  return String(val);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');

    let query = `
      SELECT
        owner_id,
        owner_full_name,
        global_asp_ytd,
        won_revenue_this_week,
        won_deals_this_week,
        opps_created_this_week,
        _loaded_at
      FROM \`gen-lang-client-0844868008.revops_analytics.executive_pulse_view\`
    `;

    const params: Record<string, string> = {};

    if (ownerId) {
      query += ' WHERE owner_id = @owner_id';
      params.owner_id = ownerId;
    }

    query += ' ORDER BY CASE WHEN owner_id = \'GLOBAL\' THEN 0 ELSE 1 END, won_revenue_this_week DESC';

    const [rows] = await bigquery.query({
      query,
      params: Object.keys(params).length > 0 ? params : undefined,
    });

    const data = rows.map((row: any) => ({
      ...row,
      _loaded_at: bqDateToString(row._loaded_at),
    }));

    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching executive pulse data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executive pulse data' },
      { status: 500 }
    );
  }
}