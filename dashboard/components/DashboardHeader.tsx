'use client';

import { signOut } from 'next-auth/react';
import ViewToggle from './ViewToggle';

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="border-b" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(13,19,33,0.8)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center lg:hidden" style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }}>
            <span className="font-bold text-sm" style={{ color: 'var(--bg-canvas)' }}>C</span>
          </div>
          <ViewToggle />
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
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
