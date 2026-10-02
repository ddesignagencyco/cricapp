import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Shared render helper for component tests.
 *
 * The app's providers are mostly noise for a unit test (a real QueryClient with
 * retries, a session probe hitting the API), so this builds a query client with
 * retries off and stale data disabled. Retries are the important part: the real
 * client retries once, which would make every rejected query take 500ms and
 * leak pending state into the assertions.
 *
 * `next/navigation` and `next/image` are mocked globally in jest.config via
 * moduleNameMapper, so components using them work without per-file setup.
 */

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
      mutations: { retry: false },
    },
    // Silence the "no queryClient" style noise without hiding real errors.
    logger: undefined,
  } as ConstructorParameters<typeof QueryClient>[0]);
}

export interface HarnessOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: HarnessOptions = {}): RenderResult {
  const { queryClient = createTestQueryClient(), ...rest } = options;
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...rest });
}

/** Waits for a suspense-free async render to settle before asserting. */
export { waitFor, screen, within } from '@testing-library/react';
