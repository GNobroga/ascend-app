import { createLoader, parseAsInteger, parseAsString } from 'nuqs';

export const customerListSearchParams = {
  search: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

export const loadCustomerListSearchParams = createLoader(customerListSearchParams);
