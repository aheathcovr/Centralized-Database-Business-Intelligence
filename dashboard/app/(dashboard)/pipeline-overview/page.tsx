'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Dashboard from '@/components/Dashboard';

export default function PipelineOverviewPage() {
  return <Dashboard />;
}
