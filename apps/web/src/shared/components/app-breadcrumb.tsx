import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@packages/ui/components/breadcrumb';
import { Fragment } from 'react';
import { Link, useMatches } from 'react-router';
import { hasCrumb, type CrumbMatch } from '@/shared/lib/route-handle';

function CrumbContent({ match }: { match: CrumbMatch }) {
  const Icon = match.handle.crumbIcon;

  return (
    <>
      {Icon && <Icon className="size-4" />}
      {match.handle.crumb(match)}
    </>
  );
}

export function AppBreadcrumb() {
  const crumbs = useMatches().filter(hasCrumb);

  if (crumbs.length === 0) return null;

  const lastIndex = crumbs.length - 1;
  const hasHiddenCrumbs = crumbs.length > 2;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((match, index) => {
          const isFirst = index === 0;
          const isLast = index === lastIndex;
          const isMiddle = !isFirst && !isLast;

          return (
            <Fragment key={match.id}>
              {index > 0 && (
                <BreadcrumbSeparator className={isMiddle ? 'hidden sm:block' : undefined} />
              )}
              {isLast && hasHiddenCrumbs && (
                <>
                  <BreadcrumbItem className="sm:hidden">
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="sm:hidden" />
                </>
              )}
              <BreadcrumbItem className={isMiddle ? 'hidden sm:inline-flex' : undefined}>
                {isLast ? (
                  <BreadcrumbPage className="inline-flex items-center gap-1.5">
                    <CrumbContent match={match} />
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="inline-flex items-center gap-1.5"
                    render={<Link to={match.pathname} />}
                  >
                    <CrumbContent match={match} />
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
