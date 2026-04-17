import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getForecastCategoryPipeline, ForecastCategoryPipelineRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerName = searchParams.get('owner_id');
    const quarter = searchParams.get('quarter');

    const data = await getForecastCategoryPipeline({
      owner_name: ownerName || undefined,
      quarter: quarter || undefined,
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
    console.error('Error fetching forecast category pipeline data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forecast category pipeline data' },
      { status: 500 }
    );
  }
}