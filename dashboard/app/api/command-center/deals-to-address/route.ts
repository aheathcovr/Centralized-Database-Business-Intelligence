import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDealsToAddress, DealsToAddressRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerName = searchParams.get('owner_id');
    const minDaysPastParam = searchParams.get('min_days_past');
    const minDaysPastClose = minDaysPastParam ? parseInt(minDaysPastParam, 10) : undefined;

    const data = await getDealsToAddress({
      owner_name: ownerName || undefined,
      min_days_past_close: minDaysPastClose,
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
    console.error('Error fetching deals to address data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals to address data' },
      { status: 500 }
    );
  }
}