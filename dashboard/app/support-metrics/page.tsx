import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import SupportMetricsDashboard from '@/components/SupportMetricsDashboard';
import { authOptions } from '@/lib/auth';

export const metadata = {
  title: 'Support Metrics — Covr Penetration Dashboard',
  description: 'Intercom Support Metrics Dashboard',
};

export default async function SupportMetricsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <SupportMetricsDashboard user={session.user} />;
}
