import { queryOptions } from '@tanstack/react-query';
import { businessesApi } from './businesses.api';

export const businessQueries = {
  all: () => ['businesses'] as const,
  mine: () =>
    queryOptions({
      queryKey: [...businessQueries.all(), 'mine'],
      queryFn: businessesApi.getMine,
    }),
  ofBusiness: (businessId: string) => [...businessQueries.all(), businessId] as const,
  detail: (businessId: string) =>
    queryOptions({
      queryKey: [...businessQueries.ofBusiness(businessId), 'detail'],
      queryFn: () => businessesApi.getById(businessId),
    }),
  socialLinks: (businessId: string) =>
    queryOptions({
      queryKey: [...businessQueries.ofBusiness(businessId), 'social-links'],
      queryFn: () => businessesApi.getSocialLinks(businessId),
    }),
  hours: (businessId: string) =>
    queryOptions({
      queryKey: [...businessQueries.ofBusiness(businessId), 'hours'],
      queryFn: () => businessesApi.getHours(businessId),
    }),
  settings: (businessId: string) =>
    queryOptions({
      queryKey: [...businessQueries.ofBusiness(businessId), 'settings'],
      queryFn: () => businessesApi.getSettings(businessId),
    }),
  members: (businessId: string) =>
    queryOptions({
      queryKey: [...businessQueries.ofBusiness(businessId), 'members'],
      queryFn: () => businessesApi.listMembers(businessId),
    }),
  images: (businessId: string) =>
    queryOptions({
      queryKey: [...businessQueries.ofBusiness(businessId), 'images'],
      queryFn: () => businessesApi.listImages(businessId),
    }),
  paymentMethods: (businessId: string) =>
    queryOptions({
      queryKey: [...businessQueries.ofBusiness(businessId), 'payment-methods'],
      queryFn: () => businessesApi.listPaymentMethods(businessId),
    }),
};
