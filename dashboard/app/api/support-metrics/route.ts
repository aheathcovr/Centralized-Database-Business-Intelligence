import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getSupportMetrics } from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600; // re-fetch from BigQuery at most once per hour

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional date range query params
    const { searchParams } = new URL(request.url);
    const start_week = searchParams.get('start_week') ?? undefined;
    const end_week = searchParams.get('end_week') ?? undefined;

    // Fetch data from BigQuery
    const metrics = await getSupportMetrics({ start_week, end_week });

    return NextResponse.json({ metrics }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching support metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support metrics' },
      { status: 500 }
    );
  }
}
