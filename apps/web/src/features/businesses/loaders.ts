import { redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { businessQueries } from './api/businesses.queries';
import { getLastBusinessId, setLastBusinessId } from './last-business';
import { canManageBusiness } from './roles';

export const NEW_BUSINESS_PATH = '/businesses/new';

export const WELCOME_PATH = '/welcome';

export const businessPath = (businessId: string) => `/b/${businessId}`;

export const businessIndexLoader = async () => {
  const businesses = await queryClient.query(businessQueries.mine());
  const lastBusinessId = getLastBusinessId();
  const target = businesses.find(({ id }) => id === lastBusinessId) ?? businesses[0];

  throw redirect(target ? businessPath(target.id) : WELCOME_PATH);
};

export const businessLayoutLoader = async ({ params }: LoaderFunctionArgs) => {
  const businesses = await queryClient.query(businessQueries.mine());
  const business = businesses.find(({ id }) => id === params.businessId);
  if (!business) throw redirect('/');

  await queryClient.query(businessQueries.detail(business.id));
  setLastBusinessId(business.id);
  return null;
};

export const SETTINGS_SECTIONS = ['business', 'hours', 'booking', 'payments', 'whatsapp'] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const settingsPath = (businessId: string, section: SettingsSection) =>
  `${businessPath(businessId)}/settings/${section}`;

const isSettingsSection = (value: unknown): value is SettingsSection =>
  SETTINGS_SECTIONS.some((section) => section === value);

export const requireBusinessManager = async ({ params }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect('/');

  const businesses = await queryClient.query(businessQueries.mine());
  const business = businesses.find(({ id }) => id === businessId);
  if (!business || !canManageBusiness(business.roles)) throw redirect(businessPath(businessId));

  return businessId;
};

export const settingsIndexLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireBusinessManager(args);
  const legacyTab = new URL(args.request.url).searchParams.get('tab');
  return redirect(settingsPath(businessId, isSettingsSection(legacyTab) ? legacyTab : 'business'));
};

export const businessDetailsLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireBusinessManager(args);
  prefetch(queryClient.query(businessQueries.images(businessId)));
  prefetch(queryClient.query(businessQueries.socialLinks(businessId)));
  await queryClient.query(businessQueries.detail(businessId));
  return null;
};

export const hoursSettingsLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireBusinessManager(args);
  prefetch(queryClient.query(businessQueries.hours(businessId)));
  return null;
};

export const bookingSettingsLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireBusinessManager(args);
  prefetch(queryClient.query(businessQueries.settings(businessId)));
  return null;
};

export const paymentSettingsLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireBusinessManager(args);
  prefetch(queryClient.query(businessQueries.paymentMethods(businessId)));
  return null;
};
