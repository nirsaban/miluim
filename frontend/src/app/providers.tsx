'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is immediately stale - always refetch on mount/focus
            staleTime: 0,
            // Cache time - keep data in cache for 5 minutes for quick back-navigation
            gcTime: 5 * 60 * 1000,
            // Refetch when window gains focus
            refetchOnWindowFocus: true,
            // Refetch when component mounts
            refetchOnMount: true,
            // Refetch when network reconnects
            refetchOnReconnect: true,
            // Retry failed requests once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            direction: 'rtl',
          },
          success: {
            style: {
              background: '#4a5d23',
            },
          },
          error: {
            style: {
              background: '#dc2626',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}
