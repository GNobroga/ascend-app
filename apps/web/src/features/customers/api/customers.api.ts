import { api } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { Customer, CustomerBlockType, PossibleDuplicateGroup } from '../types';

export type CustomerListFilters = {
  search: string;
  page: number;
};

export type CustomerRequest = {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  allowDuplicate: boolean;
};

export type UpdateCustomerRequest = CustomerRequest & {
  whatsappOptOut: boolean;
};

export type BlockCustomerRequest = {
  type: CustomerBlockType;
  until?: string;
  reason: string | null;
};

export type PayUnblockFeeRequest = {
  paymentMethodId: string;
  notes: string | null;
};

export const CUSTOMERS_PAGE_SIZE = 20;

const customersPath = (businessId: string) => `/businesses/${businessId}/customers`;

export const customersApi = {
  list: (businessId: string, { search, page }: CustomerListFilters) =>
    api.get<Paginated<Customer>>(customersPath(businessId), {
      params: { search: search || undefined, page, pageSize: CUSTOMERS_PAGE_SIZE },
    }),
  getById: (businessId: string, customerId: string) =>
    api.get<Customer>(`${customersPath(businessId)}/${customerId}`),
  listPossibleDuplicates: (businessId: string) =>
    api.get<PossibleDuplicateGroup[]>(`${customersPath(businessId)}/possible-duplicates`),
  create: (businessId: string, body: CustomerRequest) => api.post<Customer>(customersPath(businessId), body),
  update: (businessId: string, customerId: string, body: UpdateCustomerRequest) =>
    api.patch<Customer>(`${customersPath(businessId)}/${customerId}`, body),
  remove: (businessId: string, customerId: string) => api.delete<void>(`${customersPath(businessId)}/${customerId}`),
  block: (businessId: string, customerId: string, body: BlockCustomerRequest) =>
    api.post<Customer>(`${customersPath(businessId)}/${customerId}/block`, body),
  payUnblockFee: (businessId: string, customerId: string, body: PayUnblockFeeRequest) =>
    api.post<Customer>(`${customersPath(businessId)}/${customerId}/block/fee-payment`, body),
  unblock: (businessId: string, customerId: string) =>
    api.delete<void>(`${customersPath(businessId)}/${customerId}/block`),
};
