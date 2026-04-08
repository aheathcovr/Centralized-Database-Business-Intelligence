import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Covr RevOps analytics and business intelligence dashboards',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <Sidebar />
      <div className="transition-all duration-200" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <DashboardHeader user={session.user} />
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
