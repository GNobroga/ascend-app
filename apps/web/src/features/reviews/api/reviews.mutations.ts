import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { CursorPaginated } from '@/shared/api/types';
import type { Review, ReviewStatus } from '../types';
import { reviewsApi } from './reviews.api';
import { reviewQueries } from './reviews.queries';

type ReviewPages = InfiniteData<CursorPaginated<Review>>;

const patchInLists = (queryClient: QueryClient, businessId: string, reviewId: string, patch: Partial<Review>) =>
  queryClient.setQueriesData<ReviewPages>({ queryKey: reviewQueries.lists(businessId) }, (data) =>
    data && {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: page.data.map((review) => (review.id === reviewId ? { ...review, ...patch } : review)),
      })),
    },
  );

export const useSetReviewStatus = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) =>
      reviewsApi.setStatus(businessId, reviewId, status),
    onSuccess: (review) => patchInLists(queryClient, businessId, review.id, review),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reviewQueries.lists(businessId) }),
  });
};

export const useSetReviewReply = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      reviewsApi.setReply(businessId, reviewId, reply),
    onSuccess: (review) => patchInLists(queryClient, businessId, review.id, review),
  });
};

export const useRemoveReviewReply = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewsApi.removeReply(businessId, reviewId),
    onSuccess: (_, reviewId) => patchInLists(queryClient, businessId, reviewId, { reply: null, repliedAt: null }),
  });
};
