import { SidebarProvider, SidebarTrigger } from '@packages/ui/components/sidebar';
import { ThemeSwitch } from '@packages/ui/components/theme-switch';
import { Outlet, useParams } from 'react-router';
import { UserMenu } from '@/features/auth';
import { NotificationBell } from '@/features/notifications';
import { AppBreadcrumb } from '@/shared/components/app-breadcrumb';
import { DocumentTitle } from '@/shared/components/document-title';
import { AppSidebar } from './app-sidebar';

export function AppLayout() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <SidebarProvider>
      <DocumentTitle />
      <div className="flex min-h-svh bg-canvas">
        <AppSidebar businessId={businessId} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-sidebar/80 px-4 backdrop-blur-md md:px-6 lg:px-10">
            <SidebarTrigger className="-ml-2" />
            <div className="min-w-0 flex-1">
              <AppBreadcrumb />
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitch />
              <NotificationBell />
              <UserMenu />
            </div>
          </header>

          <main className="flex flex-1 flex-col px-4 py-6 md:px-6 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
