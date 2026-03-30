import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getInMonthConversionData } from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600; // re-fetch from BigQuery at most once per hour

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch data from BigQuery
    const data = await getInMonthConversionData();

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching in-month conversion data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch in-month conversion data' },
      { status: 500 }
    );
  }
}
