import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getSupportMetrics, getSupportMetricsMonthly } from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic'; // uses headers() for auth — must be dynamic

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional date range query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? 'monthly';

    if (period === 'weekly') {
      const start_week = searchParams.get('start_week') ?? undefined;
      const end_week = searchParams.get('end_week') ?? undefined;
      const metrics = await getSupportMetrics({ start_week, end_week });
      return NextResponse.json({ metrics, period: 'weekly' }, {
        headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
      });
    } else {
      const start_month = searchParams.get('start_month') ?? undefined;
      const end_month = searchParams.get('end_month') ?? undefined;
      const metrics = await getSupportMetricsMonthly({ start_month, end_month });
      return NextResponse.json({ metrics, period: 'monthly' }, {
        headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
      });
    }
  } catch (error) {
    console.error('Error fetching support metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support metrics' },
      { status: 500 }
    );
  }
}
