import { CalendarDaysIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { appointmentsLoader } from './loaders';

export const appointmentsRoutes: RouteObject[] = [
  {
    path: 'appointments',
    loader: appointmentsLoader,
    lazy: () => import('./pages/appointments-page'),
    handle: { crumb: () => 'Agenda', crumbIcon: CalendarDaysIcon } satisfies RouteHandle,
  },
];
