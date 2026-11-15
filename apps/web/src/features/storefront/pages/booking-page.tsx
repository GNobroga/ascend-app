import { Button } from '@packages/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { FormSkeleton } from '@packages/ui/components/skeletons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, CalendarOffIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { Link, useParams } from 'react-router';
import { BusinessAvatar } from '@/features/businesses';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { storefrontQueries } from '../api/storefront.queries';
import { BookingForm } from '../components/booking-form';
import { storefrontPath } from '../loaders';
import { bookingSearchParams } from '../search-params';

function BookingPage() {
  const { slug } = useParams();
  if (!slug) return null;

  return <Booking slug={slug} />;
}

type BookingProps = {
  slug: string;
};

function Booking({ slug }: BookingProps) {
  const { data: business } = useSuspenseQuery(storefrontQueries.business(slug));
  const [{ services, package: packageId }] = useQueryStates(bookingSearchParams);

  return (
    <div className="flex flex-col gap-6">
      <title>{`Agendar · ${business.name}`}</title>
      <div className="flex flex-col gap-3">
        <Link
          to={storefrontPath(slug)}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Voltar para {business.name}
        </Link>
        <div className="flex items-center gap-3">
          <BusinessAvatar business={business} className="size-12" />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">Agendar horário</h1>
            <p className="text-sm text-muted-foreground">{business.name}</p>
          </div>
        </div>
      </div>

      {business.onlineBookingAvailable ? (
        <QueryBoundary fallback={<FormSkeleton fields={5} />}>
          <BookingForm business={business} initialServiceIds={services} initialPackageId={packageId} />
        </QueryBoundary>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOffIcon />
            </EmptyMedia>
            <EmptyTitle>Agendamento online indisponível</EmptyTitle>
            <EmptyDescription>
              {business.name} não está aceitando agendamentos online no momento. Entre em contato para marcar seu
              horário.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" nativeButton={false} render={<Link to={storefrontPath(slug)} />}>
              Ver contato
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}

export { BookingPage as Component };
