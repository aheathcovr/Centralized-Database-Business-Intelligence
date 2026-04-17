import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRepMatrix, RepMatrixRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');

    // getRepMatrix does not filter by owner_id, but we include the param for future extensibility
    const data: RepMatrixRow[] = await getRepMatrix();

    // Filter by owner_id if provided (client-side filter since BQ function doesn't support it)
    const filteredData = ownerId 
      ? data.filter(row => row.owner_id === ownerId)
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
    console.error('Error fetching rep matrix data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rep matrix data' },
      { status: 500 }
    );
  }
}
