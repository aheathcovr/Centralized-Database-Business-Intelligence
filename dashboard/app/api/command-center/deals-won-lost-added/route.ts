import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDealsWonLostAdded, DealsWonLostAddedRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('start_date');
    const endMonth = searchParams.get('end_date');

    const data = await getDealsWonLostAdded({
      start_month: startMonth || undefined,
      end_month: endMonth || undefined,
    });

    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching deals won/lost/added data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals won/lost/added data' },
      { status: 500 }
    );
  }
}