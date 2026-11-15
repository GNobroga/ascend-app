import { api } from '@/shared/api/http';
import type { SocialLink } from '../social-networks';
import type {
  Business,
  BusinessHour,
  BusinessImage,
  BusinessImageType,
  BusinessMember,
  BusinessSettings,
  MyBusiness,
  PaymentMethod,
} from '../types';

export type AddressRequest = {
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
};

export type CreateBusinessRequest = {
  name: string;
  slug: string;
  description?: string | null;
  email: string;
  taxId: string;
  phone: string | null;
  phoneIsWhatsApp: boolean;
  address: AddressRequest;
};

export type CreatedBusiness = {
  id: string;
  name: string;
  slug: string;
};

export type SetBusinessHoursRequest = {
  hours: BusinessHour[];
};

export type UpdateBusinessSettingsRequest = Partial<BusinessSettings>;

export type UpdateBusinessRequest = {
  name: string;
  slug: string;
  description: string | null;
  email: string;
  phone: string | null;
  phoneIsWhatsApp: boolean;
  timezone: string;
  address: AddressRequest;
};

export type UpdateBusinessImageRequest = {
  type?: BusinessImageType;
  altText?: string | null;
};

export type PaymentMethodRequest = {
  name: string;
  description: string | null;
  isActive: boolean;
};

export const businessesApi = {
  getMine: () => api.get<MyBusiness[]>('/businesses/mine'),
  getById: (businessId: string) => api.get<Business>(`/businesses/${businessId}`),
  update: (businessId: string, body: UpdateBusinessRequest) => api.patch<Business>(`/businesses/${businessId}`, body),
  create: (body: CreateBusinessRequest) => api.post<CreatedBusiness>('/businesses', body),
  getSocialLinks: (businessId: string) => api.get<SocialLink[]>(`/businesses/${businessId}/social-links`),
  setSocialLinks: (businessId: string, links: SocialLink[]) =>
    api.put<SocialLink[]>(`/businesses/${businessId}/social-links`, { links }),
  getHours: (businessId: string) => api.get<BusinessHour[]>(`/businesses/${businessId}/hours`),
  setHours: (businessId: string, body: SetBusinessHoursRequest) =>
    api.put<BusinessHour[]>(`/businesses/${businessId}/hours`, body),
  getSettings: (businessId: string) => api.get<BusinessSettings>(`/businesses/${businessId}/settings`),
  updateSettings: (businessId: string, body: UpdateBusinessSettingsRequest) =>
    api.patch<BusinessSettings>(`/businesses/${businessId}/settings`, body),
  setLogo: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.put<Pick<MyBusiness, 'logoUrl'>>(`/businesses/${businessId}/logo`, form);
  },
  removeLogo: (businessId: string) => api.delete<void>(`/businesses/${businessId}/logo`),
  listMembers: (businessId: string) => api.get<BusinessMember[]>(`/businesses/${businessId}/members`),
  listImages: (businessId: string) => api.get<BusinessImage[]>(`/businesses/${businessId}/images`),
  uploadImage: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<BusinessImage>(`/businesses/${businessId}/images`, form);
  },
  updateImage: (businessId: string, imageId: string, body: UpdateBusinessImageRequest) =>
    api.patch<BusinessImage>(`/businesses/${businessId}/images/${imageId}`, body),
  reorderImages: (businessId: string, ids: string[]) =>
    api.put<void>(`/businesses/${businessId}/images/order`, { ids }),
  deleteImage: (businessId: string, imageId: string) =>
    api.delete<void>(`/businesses/${businessId}/images/${imageId}`),
  listPaymentMethods: (businessId: string) =>
    api.get<PaymentMethod[]>(`/businesses/${businessId}/payment-methods`),
  createPaymentMethod: (businessId: string, body: PaymentMethodRequest) =>
    api.post<PaymentMethod>(`/businesses/${businessId}/payment-methods`, body),
  updatePaymentMethod: (businessId: string, paymentMethodId: string, body: Partial<PaymentMethodRequest>) =>
    api.patch<PaymentMethod>(`/businesses/${businessId}/payment-methods/${paymentMethodId}`, body),
  removePaymentMethod: (businessId: string, paymentMethodId: string) =>
    api.delete<void>(`/businesses/${businessId}/payment-methods/${paymentMethodId}`),
};
