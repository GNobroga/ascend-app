import { CopyIcon, UserRoundIcon, UsersRoundIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { CustomerCrumb } from './components/customer-crumb';
import { customerLoader, customersLoader, possibleDuplicatesLoader } from './loaders';

export const customersRoutes: RouteObject[] = [
  {
    path: 'customers',
    handle: { crumb: () => 'Clientes', crumbIcon: UsersRoundIcon } satisfies RouteHandle,
    children: [
      {
        index: true,
        loader: customersLoader,
        lazy: () => import('./pages/customers-page'),
      },
      {
        path: 'duplicates',
        loader: possibleDuplicatesLoader,
        lazy: () => import('./pages/possible-duplicates-page'),
        handle: { crumb: () => 'Possíveis duplicados', crumbIcon: CopyIcon } satisfies RouteHandle,
      },
      {
        path: ':customerId',
        loader: customerLoader,
        lazy: () => import('./pages/customer-page'),
        handle: {
          crumb: ({ params }) =>
            params.businessId && params.customerId ? (
              <CustomerCrumb businessId={params.businessId} customerId={params.customerId} />
            ) : null,
          crumbIcon: UserRoundIcon,
        } satisfies RouteHandle,
      },
    ],
  },
];
