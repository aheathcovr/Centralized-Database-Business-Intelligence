import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getPipelineGeneration } from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start_period = searchParams.get('start_period') ?? undefined;
    const end_period = searchParams.get('end_period') ?? undefined;
    const owner_id = searchParams.get('owner_id') ?? undefined;
    const period_type = searchParams.get('period_type') as 'monthly' | 'quarterly' | undefined;

    const data = await getPipelineGeneration({ start_period, end_period, owner_id, period_type });

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching pipeline generation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline generation data' },
      { status: 500 }
    );
  }
}
