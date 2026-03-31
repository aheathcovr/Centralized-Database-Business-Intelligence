import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  getCsatPeriodic,
  getNpsPeriodic,
  getCsatByDomain,
  getOnboardingCorporations,
  getOnboardingFacilities,
  getCustomerSuccessSummary,
} from '@/lib/bigquery';
import { authOptions } from '@/lib/auth';

export const revalidate = 3600;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [csatPeriodic, npsPeriodic, csatByDomain, onboardingCorporations, onboardingFacilities, summary] =
      await Promise.all([
        getCsatPeriodic(),
        getNpsPeriodic(),
        getCsatByDomain(),
        getOnboardingCorporations(),
        getOnboardingFacilities(),
        getCustomerSuccessSummary(),
      ]);

    // Enrich summary with CSAT totals from periodic data
    const monthlyCsat = csatPeriodic.filter((r: any) => r.period_type === 'month');
    if (monthlyCsat.length > 0) {
      const totalResponses = monthlyCsat.reduce((s: number, r: any) => s + Number(r.csat_total || 0), 0);
      const totalPositive = monthlyCsat.reduce((s: number, r: any) => s + Number(r.csat_positive || 0), 0);
      summary.totalCsatResponses = totalResponses;
      summary.avgCsatScore = totalResponses > 0 ? Math.round(totalPositive * 100.0 / totalResponses * 100) / 100 : null;
    }

    return NextResponse.json({
      csatPeriodic,
      npsPeriodic,
      csatByDomain,
      npsByDomain: [],
      onboardingCorporations,
      onboardingFacilities,
      summary,
    }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching customer success data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer success data' },
      { status: 500 }
    );
  }
}
