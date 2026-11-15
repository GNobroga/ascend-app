import type { LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { requireBusinessManager } from '@/features/businesses';
import { whatsappQueries } from './api/whatsapp.queries';

export const whatsappSettingsLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireBusinessManager(args);
  prefetch(queryClient.query(whatsappQueries.connection(businessId)));
  return null;
};
