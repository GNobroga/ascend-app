import { createBrowserRouter } from 'react-router';
import { appointmentsRoutes } from '@/features/appointments';
import { authRoutes, authEmailLinkRoutes } from '@/features/auth';
import { catalogRoutes } from '@/features/catalog';
import { customersRoutes } from '@/features/customers';
import { dashboardRoutes } from '@/features/dashboard';
import { businessLayoutLoader, businessRoutes, newBusinessRoutes } from '@/features/businesses';
import { professionalsRoutes } from '@/features/professionals';
import { reviewsRoutes } from '@/features/reviews';
import { whatsappRoutes } from '@/features/whatsapp';
import { myAppointmentsRoutes } from '@/features/my-appointments';
import { storefrontRoutes } from '@/features/storefront';
import { invitationRoutes, teamRoutes } from '@/features/team';
import { usersRoutes } from '@/features/users';
import { setSessionExpiredHandler } from '@/shared/api/http';
import { buildLoginPath } from '@/shared/lib/redirect-path';
import { NotFound } from './errors/not-found';
import { RouteErrorBoundary } from './errors/route-error-boundary';
import { AppLayout } from './layouts/app-layout/app-layout';
import { authenticatedLoader } from './layouts/app-layout/authenticated-loader';
import { homeLoader } from './layouts/app-layout/home-loader';
import { AuthLayout, authLayoutLoader } from './layouts/auth-layout';
import { PublicLayout } from './layouts/public-layout';
import { RootHydrateFallback, RootLayout } from './layouts/root-layout';
import { queryClient } from './query-client';

const APP_LAYOUT_ROUTE_ID = 'app';

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    HydrateFallback: RootHydrateFallback,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        Component: AuthLayout,
        loader: authLayoutLoader,
        ErrorBoundary: RouteErrorBoundary,
        children: [...authRoutes],
      },
      {
        Component: AuthLayout,
        ErrorBoundary: RouteErrorBoundary,
        children: [...authEmailLinkRoutes, ...invitationRoutes],
      },
      {
        id: APP_LAYOUT_ROUTE_ID,
        path: '/',
        loader: authenticatedLoader,
        ErrorBoundary: RouteErrorBoundary,
        children: [
          { index: true, loader: homeLoader },
          {
            path: 'b/:businessId',
            Component: AppLayout,
            loader: businessLayoutLoader,
            ErrorBoundary: RouteErrorBoundary,
            children: [
              ...dashboardRoutes,
              ...businessRoutes,
              ...appointmentsRoutes,
              ...customersRoutes,
              ...reviewsRoutes,
              ...catalogRoutes,
              ...professionalsRoutes,
              ...teamRoutes,
              ...whatsappRoutes,
              ...usersRoutes,
            ],
          },
          ...newBusinessRoutes,
          {
            Component: PublicLayout,
            ErrorBoundary: RouteErrorBoundary,
            children: [...myAppointmentsRoutes, ...usersRoutes],
          },
        ],
      },
      {
        Component: PublicLayout,
        ErrorBoundary: RouteErrorBoundary,
        children: [...storefrontRoutes],
      },
      { path: '*', Component: NotFound },
    ],
  },
]);

setSessionExpiredHandler(() => {
  const { navigation, matches, location } = router.state;
  const isInAppArea = matches.some(({ route }) => route.id === APP_LAYOUT_ROUTE_ID);
  if (navigation.state !== 'idle' || !isInAppArea) return;

  queryClient.clear();
  void router.navigate(buildLoginPath(location));
});
