import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return <Dashboard user={session.user} />;
}