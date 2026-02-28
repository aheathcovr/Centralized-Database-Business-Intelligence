import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <Dashboard user={session.user} />;
}