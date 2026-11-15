import { CalendarCogIcon, ClockIcon, SettingsIcon, StoreIcon, WalletIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { RouteHandle } from '@/shared/lib/route-handle';
import {
  bookingSettingsLoader,
  businessDetailsLoader,
  hoursSettingsLoader,
  paymentSettingsLoader,
  settingsIndexLoader,
} from './loaders';

export const businessRoutes: RouteObject[] = [
  {
    path: 'settings',
    handle: { crumb: () => 'Configurações', crumbIcon: SettingsIcon } satisfies RouteHandle,
    children: [
      { index: true, loader: settingsIndexLoader },
      {
        path: 'business',
        loader: businessDetailsLoader,
        lazy: () => import('./pages/business-details-page'),
        handle: { crumb: () => 'Dados do negócio', crumbIcon: StoreIcon } satisfies RouteHandle,
      },
      {
        path: 'hours',
        loader: hoursSettingsLoader,
        lazy: () => import('./pages/hours-settings-page'),
        handle: { crumb: () => 'Horário de funcionamento', crumbIcon: ClockIcon } satisfies RouteHandle,
      },
      {
        path: 'booking',
        loader: bookingSettingsLoader,
        lazy: () => import('./pages/booking-settings-page'),
        handle: { crumb: () => 'Agendamento', crumbIcon: CalendarCogIcon } satisfies RouteHandle,
      },
      {
        path: 'payments',
        loader: paymentSettingsLoader,
        lazy: () => import('./pages/payment-settings-page'),
        handle: { crumb: () => 'Pagamento', crumbIcon: WalletIcon } satisfies RouteHandle,
      },
    ],
  },
];

export const newBusinessRoutes: RouteObject[] = [
  { path: 'welcome', lazy: () => import('./pages/welcome-page') },
  { path: 'businesses/new', lazy: () => import('./pages/new-business-page') },
];
