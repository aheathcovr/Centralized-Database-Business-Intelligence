'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ViewOption {
  name: string;
  href: string;
}

const viewOptions: ViewOption[] = [
  { name: 'Pipeline Generation', href: '/pipeline-overview' },
  { name: 'In-Month Conversion', href: '/in-month-conversion' },
  { name: 'Support Metrics', href: '/support-metrics' },
];

export default function ViewToggle() {
  const pathname = usePathname();

  return (
    <nav className="view-toggle" aria-label="Dashboard views">
      {viewOptions.map((view) => {
        const isActive = pathname === view.href;
        return (
          <Link
            key={view.href}
            href={view.href}
            className={`view-toggle-item ${
              isActive ? 'view-toggle-item-active' : 'view-toggle-item-inactive'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {view.name}
          </Link>
        );
      })}
    </nav>
  );
}
