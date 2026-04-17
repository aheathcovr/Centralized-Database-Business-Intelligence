import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPipelineShed, PipelineShedRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: PipelineShedRow[] = await getPipelineShed();

    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching pipeline shed data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline shed data' },
      { status: 500 }
    );
  }
}
