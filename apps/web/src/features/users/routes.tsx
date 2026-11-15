import { CircleUserIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';

export const ACCOUNT_PATH = 'account';

export const usersRoutes: RouteObject[] = [
  {
    path: ACCOUNT_PATH,
    lazy: () => import('./pages/account-page'),
    handle: { crumb: () => 'Minha conta', crumbIcon: CircleUserIcon } satisfies RouteHandle,
  },
];
