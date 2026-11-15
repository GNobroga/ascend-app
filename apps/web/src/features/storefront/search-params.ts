import { parseAsArrayOf, parseAsString } from 'nuqs';

export const bookingSearchParams = {
  services: parseAsArrayOf(parseAsString).withDefault([]),
  package: parseAsString,
};
