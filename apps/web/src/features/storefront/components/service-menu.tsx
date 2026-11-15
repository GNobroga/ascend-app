import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Spinner } from '@packages/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { storefrontQueries } from '../api/storefront.queries';
import { bookingPath } from '../loaders';
import type { PublicBusiness, PublicImage, PublicPackage, PublicService } from '../types';
import { StorefrontSection } from './storefront-section';

type ServiceMenuProps = {
  business: PublicBusiness;
};

export function ServiceMenu({ business }: ServiceMenuProps) {
  const { data: catalog, isPending } = useQuery(storefrontQueries.catalog(business.slug));

  if (isPending) return <Spinner className="self-center text-muted-foreground" />;
  if (!catalog) return null;

  const groups = [
    ...catalog.categories.map(({ id, name, description, services }) => ({ id, name, description, services })),
    ...(catalog.uncategorized.length > 0
      ? [
          {
            id: 'uncategorized',
            name: catalog.categories.length > 0 ? 'Outros serviços' : 'Serviços',
            description: null,
            services: catalog.uncategorized,
          },
        ]
      : []),
  ];

  if (groups.length === 0 && catalog.packages.length === 0) {
    return (
      <StorefrontSection id="services" title="Serviços">
        <p className="text-sm text-muted-foreground">Este negócio ainda não publicou seus serviços.</p>
      </StorefrontSection>
    );
  }

  const canBook = business.onlineBookingAvailable;

  return (
    <>
      {catalog.packages.length > 0 && (
        <StorefrontSection id="packages" title="Pacotes">
          <ul className="grid gap-3 sm:grid-cols-2">
            {catalog.packages.map((item) => (
              <li key={item.id}>
                <PackageCard slug={business.slug} item={item} canBook={canBook} />
              </li>
            ))}
          </ul>
        </StorefrontSection>
      )}

      {groups.map((group) => (
        <StorefrontSection key={group.id} id={`category-${group.id}`} title={group.name} description={group.description}>
          <Card className="py-0">
            <ul className="divide-y">
              {group.services.map((service) => (
                <li key={service.id}>
                  <ServiceRow slug={business.slug} service={service} canBook={canBook} />
                </li>
              ))}
            </ul>
          </Card>
        </StorefrontSection>
      ))}
    </>
  );
}

function Thumbnail({ image }: { image: PublicImage | undefined }) {
  if (!image) return null;
  return <img src={image.url} alt={image.altText ?? ''} className="size-16 shrink-0 rounded-xl object-cover" />;
}

type ServiceRowProps = {
  slug: string;
  service: PublicService;
  canBook: boolean;
};

function ServiceRow({ slug, service, canBook }: ServiceRowProps) {
  return (
    <div className="flex items-center gap-4 p-4">
      <Thumbnail image={service.images[0]} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="font-medium">{service.name}</h3>
        {service.description && <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>}
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatMinutes(service.durationInMinutes)} ·{' '}
          <span className="font-medium text-foreground">{formatCurrency(service.price)}</span>
        </p>
      </div>
      {canBook && (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={bookingPath(slug, { serviceId: service.id })} aria-label={`Agendar ${service.name}`} />}
        >
          Agendar
        </Button>
      )}
    </div>
  );
}

type PackageCardProps = {
  slug: string;
  item: PublicPackage;
  canBook: boolean;
};

function PackageCard({ slug, item, canBook }: PackageCardProps) {
  const savings = item.servicesPrice - item.price;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-4">
          <Thumbnail image={item.images[0]} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="font-medium">{item.name}</h3>
            <p className="text-sm text-muted-foreground">{item.services.map(({ name }) => name).join(' + ')}</p>
          </div>
        </div>
        {item.description && <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm tabular-nums">
            <span className="font-medium">{formatCurrency(item.price)}</span>
            {savings > 0 && (
              <>
                <span className="text-muted-foreground line-through">{formatCurrency(item.servicesPrice)}</span>
                <Badge variant="secondary">Economize {formatCurrency(savings)}</Badge>
              </>
            )}
            <span className="text-muted-foreground">· {formatMinutes(item.durationMinutes)}</span>
          </div>
          {canBook && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link to={bookingPath(slug, { packageId: item.id })} aria-label={`Agendar ${item.name}`} />}
            >
              Agendar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
