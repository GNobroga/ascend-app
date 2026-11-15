import { redirect, type LoaderFunctionArgs } from 'react-router';
import { userQueries } from '@/features/users';
import { isApiError } from '@/shared/api/api-error';
import { buildLoginPath } from '@/shared/lib/redirect-path';
import { queryClient } from '../../query-client';

export const authenticatedLoader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await queryClient.query(userQueries.me());
    return null;
  } catch (error) {
    if (isApiError(error) && error.statusCode === 401) throw redirect(buildLoginPath(new URL(request.url)));
    throw error;
  }
};
