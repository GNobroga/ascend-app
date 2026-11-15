import { MessageCircleIcon, SettingsIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import { whatsappSettingsLoader } from './loaders';

export const whatsappRoutes: RouteObject[] = [
  {
    path: 'settings',
    handle: { crumb: () => 'Configurações', crumbIcon: SettingsIcon } satisfies RouteHandle,
    children: [
      {
        path: 'whatsapp',
        loader: whatsappSettingsLoader,
        lazy: () => import('./pages/whatsapp-settings-page'),
        handle: { crumb: () => 'WhatsApp', crumbIcon: MessageCircleIcon } satisfies RouteHandle,
      },
    ],
  },
];
