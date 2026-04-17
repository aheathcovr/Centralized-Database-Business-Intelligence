import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getFunnelEconomics, FunnelEconomicsRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadSource = searchParams.get('lead_source');

    // getFunnelEconomics does not filter by lead_source, but we include the param for future extensibility
    const data: FunnelEconomicsRow[] = await getFunnelEconomics();

    // Filter by lead_source if provided (client-side filter since BQ function doesn't support it)
    const filteredData = leadSource
      ? data.filter(row => row.lead_source === leadSource)
      : data;

    return NextResponse.json(
      { data: filteredData },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching funnel economics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel economics data' },
      { status: 500 }
    );
  }
}
