import { Button } from '@packages/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheckIcon, MapPinIcon, StarIcon } from 'lucide-react';
import { Link } from 'react-router';
import { BusinessAvatar, BusinessImageType } from '@/features/businesses';
import { storefrontQueries } from '../api/storefront.queries';
import { formatAverage, pluralize } from '../format';
import { bookingPath } from '../loaders';
import type { PublicBusiness } from '../types';

type StorefrontHeroProps = {
  business: PublicBusiness;
};

export function StorefrontHero({ business }: StorefrontHeroProps) {
  const { data: ratings } = useQuery(storefrontQueries.ratings(business.slug));
  const cover = business.images.find(({ type }) => type === BusinessImageType.COVER) ?? business.images[0];
  const average = ratings?.business.average ?? null;

  return (
    <section className="overflow-hidden rounded-3xl border bg-card">
      <div className="aspect-3/1 max-h-72 w-full bg-linear-to-br from-primary/25 via-primary/10 to-transparent">
        {cover && <img src={cover.url} alt={cover.altText ?? ''} className="size-full object-cover" />}
      </div>

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          <BusinessAvatar
            business={business}
            className="-mt-14 size-20 border-4 border-card text-xl sm:-mt-16 sm:size-24"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{business.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {average !== null && ratings && (
                <a href="#reviews" className="flex items-center gap-1 hover:text-foreground">
                  <StarIcon className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground tabular-nums">{formatAverage(average)}</span>
                  <span>({pluralize(ratings.business.count, 'avaliação', 'avaliações')})</span>
                </a>
              )}
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-4" />
                {business.address.district}, {business.address.city}
              </span>
            </div>
          </div>
        </div>

        {business.onlineBookingAvailable && (
          <Button size="lg" nativeButton={false} render={<Link to={bookingPath(business.slug)} />}>
            <CalendarCheckIcon />
            Agendar horário
          </Button>
        )}
      </div>

      {business.description && (
        <p className="border-t px-5 py-4 text-sm text-pretty whitespace-pre-line text-muted-foreground sm:px-6">
          {business.description}
        </p>
      )}
    </section>
  );
}
