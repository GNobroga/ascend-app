import { data, redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { userQueries } from '@/features/users';
import { hasErrorCode, isApiError } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { buildLoginPath } from '@/shared/lib/redirect-path';
import { storefrontQueries } from './api/storefront.queries';

export const storefrontPath = (slug: string) => `/${slug}`;

export const bookingPath = (slug: string, selection: { serviceId?: string; packageId?: string } = {}) => {
  const search = new URLSearchParams();
  if (selection.serviceId) search.set('services', selection.serviceId);
  if (selection.packageId) search.set('package', selection.packageId);
  const query = search.toString();
  return `${storefrontPath(slug)}/book${query ? `?${query}` : ''}`;
};

const ensureBusiness = async (slug: string) => {
  try {
    return await queryClient.query(storefrontQueries.business(slug));
  } catch (error) {
    if (hasErrorCode(error, ErrorCode.BUSINESS_NOT_FOUND)) throw data(null, { status: 404 });
    throw error;
  }
};

export const storefrontLoader = async ({ params }: LoaderFunctionArgs) => {
  const { slug } = params;
  if (!slug) throw data(null, { status: 404 });

  prefetch(queryClient.query(userQueries.me()));
  await ensureBusiness(slug);
  prefetch(queryClient.query(storefrontQueries.catalog(slug)));
  prefetch(queryClient.query(storefrontQueries.professionals(slug)));
  prefetch(queryClient.query(storefrontQueries.ratings(slug)));
  prefetch(queryClient.infiniteQuery(storefrontQueries.reviews(slug)));
  return null;
};

export const bookingLoader = async ({ params, request }: LoaderFunctionArgs) => {
  const { slug } = params;
  if (!slug) throw data(null, { status: 404 });

  try {
    await queryClient.query(userQueries.me());
  } catch (error) {
    if (isApiError(error) && error.statusCode === 401) throw redirect(buildLoginPath(new URL(request.url)));
    throw error;
  }

  prefetch(queryClient.query(storefrontQueries.catalog(slug)));
  prefetch(queryClient.query(storefrontQueries.professionals(slug)));
  await ensureBusiness(slug);
  return null;
};
