import { Button } from '@packages/ui/components/button';
import { ThemeSwitch } from '@packages/ui/components/theme-switch';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation } from 'react-router';
import ascendLogoDark from '@/assets/brand/ascend-logo-dark.webp';
import ascendLogo from '@/assets/brand/ascend-logo.webp';
import { UserMenu } from '@/features/auth';
import { userQueries } from '@/features/users';
import { env } from '@/shared/env';
import { buildLoginPath } from '@/shared/lib/redirect-path';

export function PublicLayout() {
  const location = useLocation();
  const { data: user, isPending } = useQuery(userQueries.me());

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <span className="flex items-center">
            <img src={ascendLogo} alt={env.VITE_APP_NAME} className="h-6 w-auto dark:hidden" />
            <img src={ascendLogoDark} alt={env.VITE_APP_NAME} className="hidden h-6 w-auto dark:block" />
          </span>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            {user ? (
              <UserMenu />
            ) : (
              !isPending && (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link to={buildLoginPath(location)} />}>
                  Entrar
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Agendamento online por {env.VITE_APP_NAME}
      </footer>
    </div>
  );
}
