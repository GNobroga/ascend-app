import { queryOptions } from '@tanstack/react-query';
import { usersApi } from './users.api';

export const userQueries = {
  all: () => ['users'] as const,
  me: () =>
    queryOptions({
      queryKey: [...userQueries.all(), 'me'],
      queryFn: usersApi.getMe,
      retry: false,
    }),
};
