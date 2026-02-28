import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getCorporationsData, getSummaryStats } from '@/lib/bigquery';
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
    const [corporations, stats] = await Promise.all([
      getCorporationsData(),
      getSummaryStats(),
    ]);

    return NextResponse.json({ corporations, stats }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching corporations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}