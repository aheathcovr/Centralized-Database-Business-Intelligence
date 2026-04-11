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
    <header className="border-b" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(248,249,250,0.9)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center justify-end px-6 py-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B7E6B', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Live</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name || user?.email}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
