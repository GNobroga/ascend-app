import { NuqsAdapter } from 'nuqs/adapters/react-router/v8';
import { Outlet, useNavigation } from 'react-router';
import { AscendLoader } from '@/shared/components/ascend-loader';

export function RootLayout() {
  const navigation = useNavigation();

  return (
    <NuqsAdapter>
      {navigation.state !== 'idle' && (
        <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary" />
      )}
      <Outlet />
    </NuqsAdapter>
  );
}

export function RootHydrateFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <AscendLoader className="size-20 animate-in duration-500 delay-300 fade-in fill-mode-both" />
    </div>
  );
}
