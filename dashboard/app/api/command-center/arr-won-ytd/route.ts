import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getArrWonYtd, ArrWonYtdRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dealOwnerName = searchParams.get('owner_id');
    const periodType = searchParams.get('period_type') as 'monthly' | 'quarterly' | null;

    const data = await getArrWonYtd({
      deal_owner_name: dealOwnerName || undefined,
      period_type: periodType || undefined,
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
    console.error('Error fetching ARR won YTD data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ARR won YTD data' },
      { status: 500 }
    );
  }
}