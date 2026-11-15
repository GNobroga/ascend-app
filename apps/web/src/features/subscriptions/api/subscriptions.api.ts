import { api } from '@/shared/api/http';
import type { Subscription } from '../types';

export const subscriptionsApi = {
  getByBusiness: (businessId: string) => api.get<Subscription>(`/businesses/${businessId}/subscription`),
};
