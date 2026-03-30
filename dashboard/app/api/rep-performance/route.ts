import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getRepPerformance } from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start_month = searchParams.get('start_month') ?? undefined;
    const end_month = searchParams.get('end_month') ?? undefined;
    const owner_id = searchParams.get('owner_id') ?? undefined;

    const data = await getRepPerformance({ start_month, end_month, owner_id });

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching rep performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rep performance data' },
      { status: 500 }
    );
  }
}
