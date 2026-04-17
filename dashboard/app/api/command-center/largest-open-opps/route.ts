import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getLargestOpenOpps, LargestOpenOppsRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const data = await getLargestOpenOpps({
      limit: limit,
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
    console.error('Error fetching largest open opps data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch largest open opps data' },
      { status: 500 }
    );
  }
}