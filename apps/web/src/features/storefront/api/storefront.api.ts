import type { BusinessRatings } from '@/features/reviews';
import { api } from '@/shared/api/http';
import type { CursorPaginated } from '@/shared/api/types';
import type { PublicAvailability, PublicBusiness, PublicCatalog, PublicProfessional, PublicReview } from '../types';

export type PublicAvailabilityQuery = {
  date: string;
  professionalId: string | null;
} & ({ serviceIds: string[] } | { packageId: string });

export const PUBLIC_REVIEWS_PAGE_SIZE = 6;

const publicPath = (slug: string) => `/public/businesses/${slug}`;

export const storefrontApi = {
  getBusiness: (slug: string) => api.get<PublicBusiness>(publicPath(slug)),
  getCatalog: (slug: string) => api.get<PublicCatalog>(`${publicPath(slug)}/services`),
  listProfessionals: (slug: string, serviceId: string | null) =>
    api.get<PublicProfessional[]>(`${publicPath(slug)}/professionals`, {
      params: { serviceId: serviceId ?? undefined },
    }),
  listReviews: (slug: string, cursor: string | null) =>
    api.get<CursorPaginated<PublicReview>>(`${publicPath(slug)}/reviews`, {
      params: { cursor: cursor ?? undefined, limit: PUBLIC_REVIEWS_PAGE_SIZE },
    }),
  getRatings: (slug: string) => api.get<BusinessRatings>(`${publicPath(slug)}/ratings`),
  getAvailability: (slug: string, { date, professionalId, ...selection }: PublicAvailabilityQuery) =>
    api.get<PublicAvailability>(`${publicPath(slug)}/availability`, {
      params: {
        date,
        professionalId: professionalId ?? undefined,
        ...('serviceIds' in selection ? { serviceIds: selection.serviceIds.join(',') } : selection),
      },
    }),
};
