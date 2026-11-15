import { ContactIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { acceptInvitationLoader, teamLoader } from './loaders';

export const teamRoutes: RouteObject[] = [
  {
    path: 'team',
    loader: teamLoader,
    lazy: () => import('./pages/team-page'),
    handle: { crumb: () => 'Equipe', crumbIcon: ContactIcon } satisfies RouteHandle,
  },
];

export const invitationRoutes: RouteObject[] = [
  {
    path: 'accept-invitation',
    loader: acceptInvitationLoader,
    lazy: () => import('./pages/accept-invitation-page'),
  },
];
