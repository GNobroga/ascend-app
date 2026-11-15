import { parseAsString } from 'nuqs';

export const loginSearchParams = {
  redirectTo: parseAsString,
  error: parseAsString,
};

export const resetPasswordSearchParams = {
  token: parseAsString,
};

export const registerSearchParams = {
  redirectTo: parseAsString,
  email: parseAsString,
};
