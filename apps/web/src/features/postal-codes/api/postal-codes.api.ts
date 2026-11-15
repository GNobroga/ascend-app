import { api } from '@/shared/api/http';
import type { PostalCodeAddress } from '../types';

export const postalCodesApi = {
  lookup: (postalCode: string) => api.get<PostalCodeAddress>(`/postal-codes/${postalCode}`),
};
