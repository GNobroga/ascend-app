import type { ReactNode } from 'react';
import ascendLogoDark from '@/assets/brand/ascend-logo-dark.webp';
import ascendLogo from '@/assets/brand/ascend-logo.webp';
import { UserMenu } from '@/features/auth';
import { env } from '@/shared/env';

type OnboardingShellProps = {
  children: ReactNode;
};

export function OnboardingShell({ children }: OnboardingShellProps) {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
        <img src={ascendLogo} alt={env.VITE_APP_NAME} className="h-7 w-auto dark:hidden" />
        <img src={ascendLogoDark} alt={env.VITE_APP_NAME} className="hidden h-7 w-auto dark:block" />
        <UserMenu />
      </header>
      <main className="flex flex-1 justify-center px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
