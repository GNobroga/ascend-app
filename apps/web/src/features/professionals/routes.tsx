import { UserRoundIcon, UsersIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { ProfessionalCrumb } from './components/professional-crumb';
import { professionalLoader, professionalsLoader } from './loaders';

export const professionalsRoutes: RouteObject[] = [
  {
    path: 'professionals',
    handle: { crumb: () => 'Profissionais', crumbIcon: UsersIcon } satisfies RouteHandle,
    children: [
      {
        index: true,
        loader: professionalsLoader,
        lazy: () => import('./pages/professionals-page'),
      },
      {
        path: ':professionalId',
        loader: professionalLoader,
        lazy: () => import('./pages/professional-page'),
        handle: {
          crumb: ({ params }) =>
            params.businessId && params.professionalId ? (
              <ProfessionalCrumb businessId={params.businessId} professionalId={params.professionalId} />
            ) : null,
          crumbIcon: UserRoundIcon,
        } satisfies RouteHandle,
      },
    ],
  },
];
