import { useMatches } from 'react-router';
import { env } from '@/shared/env';
import { hasCrumb } from '@/shared/lib/route-handle';

export function DocumentTitle() {
  const lastCrumb = useMatches().filter(hasCrumb).at(-1);
  const pageTitle = lastCrumb?.handle.crumb(lastCrumb);

  return <title>{typeof pageTitle === 'string' ? `${pageTitle} · ${env.VITE_APP_NAME}` : env.VITE_APP_NAME}</title>;
}
