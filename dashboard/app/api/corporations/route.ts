import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getCorporationsData, getSummaryStats } from '@/lib/bigquery';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch data from BigQuery
    const [corporations, stats] = await Promise.all([
      getCorporationsData(),
      getSummaryStats(),
    ]);

    return NextResponse.json({ corporations, stats });
  } catch (error) {
    console.error('Error fetching corporations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}