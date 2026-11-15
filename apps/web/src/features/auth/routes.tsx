import { redirect, type RouteObject } from 'react-router';

export const authRoutes: RouteObject[] = [
  { path: 'login', lazy: () => import('./pages/login-page') },
  { path: 'register', lazy: () => import('./pages/register-page') },
  { path: 'forgot-password', lazy: () => import('./pages/forgot-password-page') },
  { path: 'auth/callback', loader: ({ request }) => redirect(`/login${new URL(request.url).search}`) },
];

export const authEmailLinkRoutes: RouteObject[] = [
  { path: 'email-verified', lazy: () => import('./pages/email-verified-page') },
  { path: 'reset-password', lazy: () => import('./pages/reset-password-page') },
];
