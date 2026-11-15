import type { RouteObject } from 'react-router';
import { myAppointmentsLoader } from './loaders';

export const myAppointmentsRoutes: RouteObject[] = [
  {
    path: 'me/appointments',
    children: [
      { index: true, loader: myAppointmentsLoader, lazy: () => import('./pages/my-appointments-page') },
      { path: ':appointmentId', loader: myAppointmentsLoader, lazy: () => import('./pages/my-appointments-page') },
    ],
  },
];
