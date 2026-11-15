import { redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { businessPath } from '@/features/businesses';
import { catalogQueries } from './api/catalog.queries';

const requireBusinessId = ({ params }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect('/');
  return businessId;
};

export const catalogIndexLoader = (args: LoaderFunctionArgs) =>
  redirect(`${businessPath(requireBusinessId(args))}/catalog/services`);

export const servicesLoader = (args: LoaderFunctionArgs) => {
  const businessId = requireBusinessId(args);

  prefetch(queryClient.query(catalogQueries.services(businessId)));
  prefetch(queryClient.query(catalogQueries.categories(businessId)));
  return null;
};

export const packagesLoader = (args: LoaderFunctionArgs) => {
  const businessId = requireBusinessId(args);

  prefetch(queryClient.query(catalogQueries.packages(businessId)));
  prefetch(queryClient.query(catalogQueries.services(businessId)));
  return null;
};

export const categoriesLoader = (args: LoaderFunctionArgs) => {
  const businessId = requireBusinessId(args);

  prefetch(queryClient.query(catalogQueries.categories(businessId)));
  prefetch(queryClient.query(catalogQueries.services(businessId)));
  return null;
};
