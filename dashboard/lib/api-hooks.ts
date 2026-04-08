/**
 * API query hooks using TanStack Query.
 *
 * These hooks replace the custom useQuery in lib/hooks.ts with
 * TanStack Query, providing automatic caching, deduplication,
 * background refetching, and stale-while-revalidate behavior.
 *
 * Usage in components:
 *   const { data, isLoading, error } = useCorporations();
 *   const { data } = useSupportMetrics({ start_week: '2024-01-01' });
 */
import { useQuery } from '@tanstack/react-query';

// ── Query key factory ──────────────────────────────────────────
// Centralized query keys for cache invalidation and deduplication
export const queryKeys = {
  corporations: {
    all: ['corporations'] as const,
    filtered: (filters: Record<string, string | number>) =>
      ['corporations', 'filtered', filters] as const,
  },
  supportMetrics: {
    weekly: (params?: Record<string, string>) =>
      ['support-metrics', 'weekly', params] as const,
    monthly: (params?: Record<string, string>) =>
      ['support-metrics', 'monthly', params] as const,
  },
  inMonthConversion: (params?: Record<string, string>) =>
    ['in-month-conversion', params] as const,
  repPerformance: (params?: Record<string, string>) =>
    ['rep-performance', params] as const,
  pipelineGeneration: (params?: Record<string, string>) =>
    ['pipeline-generation', params] as const,
  pipelineMetrics: (params?: Record<string, string>) =>
    ['pipeline-metrics', params] as const,
  customerSuccess: {
    csatPeriodic: ['customer-success', 'csat-periodic'] as const,
    npsPeriodic: ['customer-success', 'nps-periodic'] as const,
    csatByDomain: ['customer-success', 'csat-by-domain'] as const,
    onboardingCorps: ['customer-success', 'onboarding-corps'] as const,
    onboardingFacilities: ['customer-success', 'onboarding-facilities'] as const,
    summary: ['customer-success', 'summary'] as const,
  },
};

// ── Generic fetcher ────────────────────────────────────────────
async function apiFetch<T>(url: string, params?: Record<string, string>): Promise<T> {
  const searchParams = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const response = await fetch(`${url}${searchParams}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ── Corporation hooks ──────────────────────────────────────────
export function useCorporations() {
  return useQuery({
    queryKey: queryKeys.corporations.all,
    queryFn: () =>
      apiFetch<{ corporations: unknown[]; stats: unknown }>('/api/corporations'),
  });
}

// ── Support metrics hooks ──────────────────────────────────────
export function useSupportMetrics(params?: { start_week?: string; end_week?: string }) {
  return useQuery({
    queryKey: queryKeys.supportMetrics.weekly(params),
    queryFn: () => apiFetch<unknown[]>('/api/support-metrics', params),
  });
}

// ── In-month conversion hook ───────────────────────────────────
export function useInMonthConversion(params?: {
  start_month?: string;
  end_month?: string;
  deal_owner_id?: string;
}) {
  return useQuery({
    queryKey: queryKeys.inMonthConversion(params),
    queryFn: () => apiFetch<unknown[]>('/api/in-month-conversion', params),
  });
}

// ── Rep performance hook ───────────────────────────────────────
export function useRepPerformance(params?: {
  start_month?: string;
  end_month?: string;
  owner_id?: string;
}) {
  return useQuery({
    queryKey: queryKeys.repPerformance(params),
    queryFn: () => apiFetch<unknown[]>('/api/rep-performance', params),
  });
}

// ── Pipeline generation hook ────────────────────────────────────
export function usePipelineGeneration(params?: {
  start_period?: string;
  end_period?: string;
  owner_id?: string;
  period_type?: string;
}) {
  return useQuery({
    queryKey: queryKeys.pipelineGeneration(params),
    queryFn: () => apiFetch<unknown[]>('/api/pipeline-generation', params),
  });
}

// ── Pipeline metrics hook ──────────────────────────────────────
export function usePipelineMetrics(params?: {
  group_mode?: string;
  trailing_window?: string;
}) {
  return useQuery({
    queryKey: queryKeys.pipelineMetrics(params),
    queryFn: () => apiFetch<unknown[]>('/api/pipeline-metrics', params),
  });
}

// ── Customer success hooks ─────────────────────────────────────
export function useCsatPeriodic() {
  return useQuery({
    queryKey: queryKeys.customerSuccess.csatPeriodic,
    queryFn: () => apiFetch<unknown[]>('/api/customer-success', { type: 'csat' }),
  });
}

export function useNpsPeriodic() {
  return useQuery({
    queryKey: queryKeys.customerSuccess.npsPeriodic,
    queryFn: () => apiFetch<unknown[]>('/api/customer-success', { type: 'nps' }),
  });
}

export function useCustomerSuccessSummary() {
  return useQuery({
    queryKey: queryKeys.customerSuccess.summary,
    queryFn: () => apiFetch<unknown>('/api/customer-success', { type: 'summary' }),
  });
}