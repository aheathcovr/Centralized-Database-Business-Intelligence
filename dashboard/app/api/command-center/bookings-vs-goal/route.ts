import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getBookingsVsGoal, BookingsVsGoalRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerName = searchParams.get('owner_id');
    const periodType = searchParams.get('period_type') as 'annual' | 'quarterly' | null;

    const data = await getBookingsVsGoal({
      owner_name: ownerName || undefined,
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
    console.error('Error fetching bookings vs goal data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings vs goal data' },
      { status: 500 }
    );
  }
}