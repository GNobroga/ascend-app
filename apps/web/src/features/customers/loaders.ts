import { redirect, type LoaderFunctionArgs } from 'react-router';
import { prefetch, queryClient } from '@/app/query-client';
import { businessPath, businessQueries } from '@/features/businesses';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { customerQueries } from './api/customers.queries';
import { loadCustomerListSearchParams } from './search-params';

export const customersPath = (businessId: string) => `${businessPath(businessId)}/customers`;

export const customerPath = (businessId: string, customerId: string) => `${customersPath(businessId)}/${customerId}`;

export const customersLoader = ({ params, request }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect('/');

  prefetch(queryClient.query(customerQueries.list(businessId, loadCustomerListSearchParams(request))));
  return null;
};

export const customerLoader = async ({ params }: LoaderFunctionArgs) => {
  const { businessId, customerId } = params;
  if (!businessId) throw redirect('/');
  if (!customerId) throw redirect(customersPath(businessId));

  try {
    await Promise.all([
      queryClient.query(customerQueries.detail(businessId, customerId)),
      queryClient.query(businessQueries.mine()),
    ]);
  } catch (error) {
    if (hasErrorCode(error, ErrorCode.CUSTOMER_NOT_FOUND)) throw redirect(customersPath(businessId));
    throw error;
  }
  return null;
};

export const possibleDuplicatesLoader = ({ params }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect('/');

  prefetch(queryClient.query(customerQueries.possibleDuplicates(businessId)));
  return null;
};
