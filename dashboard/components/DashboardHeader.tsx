'use client';

import { signOut } from 'next-auth/react';

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-covr-blue rounded-lg flex items-center justify-center lg:hidden">
            <span className="text-white font-bold text-sm">C</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-secondary text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
