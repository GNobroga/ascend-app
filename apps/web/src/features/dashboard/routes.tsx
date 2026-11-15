import { HouseIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { dashboardLoader } from './loaders';

export const dashboardRoutes: RouteObject[] = [
  {
    index: true,
    loader: dashboardLoader,
    lazy: () => import('./pages/dashboard-page'),
    handle: { crumb: () => 'Início', crumbIcon: HouseIcon } satisfies RouteHandle,
  },
];
