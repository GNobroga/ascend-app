import { StarIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { reviewsLoader } from './loaders';

export const reviewsRoutes: RouteObject[] = [
  {
    path: 'reviews',
    loader: reviewsLoader,
    lazy: () => import('./pages/reviews-page'),
    handle: { crumb: () => 'Avaliações', crumbIcon: StarIcon } satisfies RouteHandle,
  },
];
