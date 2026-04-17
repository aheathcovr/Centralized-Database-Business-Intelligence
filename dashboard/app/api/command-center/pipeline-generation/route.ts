import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPipelineGeneration, PipelineGenerationRow } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const data: PipelineGenerationRow[] = await getPipelineGeneration({
      start_period: startDate || undefined,
      end_period: endDate || undefined,
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
    console.error('Error fetching pipeline generation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline generation data' },
      { status: 500 }
    );
  }
}
