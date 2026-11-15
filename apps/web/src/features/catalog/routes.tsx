import { FolderIcon, LayoutListIcon, PackageIcon, ScissorsIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { catalogIndexLoader, categoriesLoader, packagesLoader, servicesLoader } from './loaders';

export const catalogRoutes: RouteObject[] = [
  {
    path: 'catalog',
    handle: { crumb: () => 'Catálogo', crumbIcon: LayoutListIcon } satisfies RouteHandle,
    children: [
      { index: true, loader: catalogIndexLoader },
      {
        path: 'services',
        loader: servicesLoader,
        lazy: () => import('./pages/services-page'),
        handle: { crumb: () => 'Serviços', crumbIcon: ScissorsIcon } satisfies RouteHandle,
      },
      {
        path: 'packages',
        loader: packagesLoader,
        lazy: () => import('./pages/packages-page'),
        handle: { crumb: () => 'Pacotes', crumbIcon: PackageIcon } satisfies RouteHandle,
      },
      {
        path: 'categories',
        loader: categoriesLoader,
        lazy: () => import('./pages/categories-page'),
        handle: { crumb: () => 'Categorias', crumbIcon: FolderIcon } satisfies RouteHandle,
      },
    ],
  },
];
