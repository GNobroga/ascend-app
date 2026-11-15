export const safeRedirectPath = (value: string | null | undefined, fallback = '/') =>
  value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback;

export const buildLoginPath = ({ pathname, search }: { pathname: string; search: string }) =>
  `/login?${new URLSearchParams({ redirectTo: pathname + search })}`;

export const withRedirectTo = (path: string, redirectTo: string | null | undefined, params: Record<string, string> = {}) => {
  const search = new URLSearchParams(params);
  if (redirectTo) search.set('redirectTo', redirectTo);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};
