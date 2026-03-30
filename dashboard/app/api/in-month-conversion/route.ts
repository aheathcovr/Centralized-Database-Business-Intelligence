import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getInMonthConversion } from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600; // re-fetch from BigQuery at most once per hour

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional query params
    const { searchParams } = new URL(request.url);
    const start_month = searchParams.get('start_month') ?? undefined;
    const end_month = searchParams.get('end_month') ?? undefined;
    const deal_owner_id = searchParams.get('deal_owner_id') ?? undefined;

    // Fetch data from BigQuery
    const data = await getInMonthConversion({ start_month, end_month, deal_owner_id });

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching in-month conversion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch in-month conversion data' },
      { status: 500 }
    );
  }
}
