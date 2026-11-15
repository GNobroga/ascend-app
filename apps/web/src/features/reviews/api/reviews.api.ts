import { api } from '@/shared/api/http';
import type { CursorPaginated } from '@/shared/api/types';
import type { BusinessRatings, Review, ReviewStatus } from '../types';

export type ReviewListFilters = {
  rating: number | null;
  status: ReviewStatus | null;
  professional: string | null;
};

export const REVIEWS_PAGE_SIZE = 20;

const reviewsPath = (businessId: string) => `/businesses/${businessId}/reviews`;

export const reviewsApi = {
  list: (businessId: string, { rating, status, professional }: ReviewListFilters, cursor: string | null) =>
    api.get<CursorPaginated<Review>>(reviewsPath(businessId), {
      params: {
        rating: rating ?? undefined,
        status: status ?? undefined,
        professionalId: professional ?? undefined,
        cursor: cursor ?? undefined,
        limit: REVIEWS_PAGE_SIZE,
      },
    }),
  ratings: (slug: string) => api.get<BusinessRatings>(`/public/businesses/${slug}/ratings`),
  setStatus: (businessId: string, reviewId: string, status: ReviewStatus) =>
    api.patch<Review>(`${reviewsPath(businessId)}/${reviewId}`, { status }),
  setReply: (businessId: string, reviewId: string, reply: string) =>
    api.put<Review>(`${reviewsPath(businessId)}/${reviewId}/reply`, { reply }),
  removeReply: (businessId: string, reviewId: string) =>
    api.delete<void>(`${reviewsPath(businessId)}/${reviewId}/reply`),
};
