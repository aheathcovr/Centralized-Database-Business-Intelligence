import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getPipelineMetrics } from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const group_mode = searchParams.get('group_mode') ?? undefined;
    const trailing_window = searchParams.get('trailing_window') ?? undefined;

    const data = await getPipelineMetrics({ group_mode, trailing_window });

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching pipeline metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline metrics' },
      { status: 500 }
    );
  }
}
