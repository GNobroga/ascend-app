import { Toaster } from '@packages/ui/components/sonner';
import { ThemeProvider } from '@packages/ui/components/theme-provider';
import { TooltipProvider } from '@packages/ui/components/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router/dom';
import { queryClient } from './query-client';
import { router } from './router';

export function Providers() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
        <Toaster richColors position="bottom-center" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
