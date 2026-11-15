import type { RouteObject } from 'react-router';
import { bookingLoader, storefrontLoader } from './loaders';

export const storefrontRoutes: RouteObject[] = [
  {
    path: ':slug',
    children: [
      { index: true, loader: storefrontLoader, lazy: () => import('./pages/storefront-page') },
      { path: 'book', loader: bookingLoader, lazy: () => import('./pages/booking-page') },
    ],
  },
];
