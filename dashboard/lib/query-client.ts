import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client configuration.
 *
 * - staleTime: 5 minutes — data is considered fresh for 5 min
 *   (BigQuery views refresh on Airbyte sync cycles, typically 15–60 min)
 * - gcTime: 30 minutes — unused cache entries are garbage-collected after 30 min
 * - refetchOnWindowFocus: false — avoids unnecessary BigQuery re-queries on tab focus
 * - retry: 1 — single retry on failure before showing error
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new client if we don't already have one
  // This is important so we don't re-create a new client on every HMR update
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}