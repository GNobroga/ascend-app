import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Customer } from '../types';
import {
  customersApi,
  type BlockCustomerRequest,
  type CustomerRequest,
  type PayUnblockFeeRequest,
  type UpdateCustomerRequest,
} from './customers.api';
import { customerQueries } from './customers.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

const refreshCustomers = (queryClient: QueryClient, businessId: string, customer: Customer) => {
  queryClient.setQueryData(customerQueries.detail(businessId, customer.id).queryKey, customer);
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: customerQueries.lists(businessId) }),
    queryClient.invalidateQueries({ queryKey: customerQueries.possibleDuplicates(businessId).queryKey }),
  ]);
};

export const useCreateCustomer = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CustomerRequest) => customersApi.create(businessId, body),
    onSuccess: (customer) => refreshCustomers(queryClient, businessId, customer),
    onError,
  });
};

export const useUpdateCustomer = (businessId: string, customerId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateCustomerRequest) => customersApi.update(businessId, customerId, body),
    onSuccess: (customer) => refreshCustomers(queryClient, businessId, customer),
    onError,
  });
};

export const useRemoveCustomer = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => customersApi.remove(businessId, customerId),
    onSuccess: (_result, customerId) => {
      queryClient.removeQueries({ queryKey: customerQueries.detail(businessId, customerId).queryKey });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: customerQueries.lists(businessId) }),
        queryClient.invalidateQueries({ queryKey: customerQueries.possibleDuplicates(businessId).queryKey }),
      ]);
    },
  });
};

const storeCustomer = (queryClient: QueryClient, businessId: string, customer: Customer) => {
  queryClient.setQueryData(customerQueries.detail(businessId, customer.id).queryKey, customer);
  return queryClient.invalidateQueries({ queryKey: customerQueries.lists(businessId) });
};

export const useBlockCustomer = (businessId: string, customerId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: BlockCustomerRequest) => customersApi.block(businessId, customerId, body),
    onSuccess: (customer) => storeCustomer(queryClient, businessId, customer),
    onError,
  });
};

export const usePayUnblockFee = (businessId: string, customerId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PayUnblockFeeRequest) => customersApi.payUnblockFee(businessId, customerId, body),
    onSuccess: (customer) => storeCustomer(queryClient, businessId, customer),
    onError,
  });
};

export const useUnblockCustomer = (businessId: string, customerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => customersApi.unblock(businessId, customerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueries.all(businessId) }),
  });
};
