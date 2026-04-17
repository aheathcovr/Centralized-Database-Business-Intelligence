import { NextResponse } from 'next/server';
import { getWalletshare } from '@/lib/bigquery';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const product = searchParams.get('product') ?? undefined;

  try {
    const data = await getWalletshare({ status, product });
    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching walletshare data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch walletshare data' },
      { status: 500 }
    );
  }
}