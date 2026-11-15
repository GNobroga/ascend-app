import { redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { businessPath } from '@/features/businesses';
import { reviewQueries } from './api/reviews.queries';
import { loadReviewListSearchParams } from './search-params';

export const reviewsPath = (businessId: string) => `${businessPath(businessId)}/reviews`;

export const reviewsLoader = ({ params, request }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect('/');

  prefetch(queryClient.infiniteQuery(reviewQueries.list(businessId, loadReviewListSearchParams(request))));
  return null;
};
