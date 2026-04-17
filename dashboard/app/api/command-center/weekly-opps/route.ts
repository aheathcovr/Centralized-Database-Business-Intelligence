import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getWeeklyOpps, WeeklyOppsRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerName = searchParams.get('owner_id');
    const startWeek = searchParams.get('start_date');
    const endWeek = searchParams.get('end_date');

    const data = await getWeeklyOpps({
      owner_name: ownerName || undefined,
      start_week: startWeek || undefined,
      end_week: endWeek || undefined,
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
    console.error('Error fetching weekly opps data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly opps data' },
      { status: 500 }
    );
  }
}