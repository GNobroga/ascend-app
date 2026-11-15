import { useQuery } from '@tanstack/react-query';
import { customerQueries } from '../api/customers.queries';

type CustomerCrumbProps = {
  businessId: string;
  customerId: string;
};

export function CustomerCrumb({ businessId, customerId }: CustomerCrumbProps) {
  const { data: customer } = useQuery(customerQueries.detail(businessId, customerId));
  return customer?.name ?? 'Cliente';
}
