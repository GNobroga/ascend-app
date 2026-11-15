import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CalendarOffIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { storefrontQueries } from '../api/storefront.queries';
import { BusinessInfo } from '../components/business-info';
import { GallerySection } from '../components/gallery-section';
import { ProfessionalsSection } from '../components/professionals-section';
import { ReviewsSection } from '../components/reviews-section';
import { ServiceMenu } from '../components/service-menu';
import { StorefrontHero } from '../components/storefront-hero';

function StorefrontPage() {
  const { slug } = useParams();
  if (!slug) return null;

  return <Storefront slug={slug} />;
}

type StorefrontProps = {
  slug: string;
};

function Storefront({ slug }: StorefrontProps) {
  const { data: business } = useSuspenseQuery(storefrontQueries.business(slug));

  return (
    <div className="flex flex-col gap-8">
      <title>{business.name}</title>
      <StorefrontHero business={business} />

      {!business.onlineBookingAvailable && (
        <Alert>
          <CalendarOffIcon />
          <AlertDescription>
            {business.name} não está aceitando agendamentos online no momento. Entre em contato para marcar seu
            horário.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <ServiceMenu business={business} />
          <ProfessionalsSection slug={slug} />
          <GallerySection business={business} />
          <ReviewsSection business={business} />
        </div>
        <aside className="lg:sticky lg:top-20">
          <BusinessInfo business={business} />
        </aside>
      </div>
    </div>
  );
}

export { StorefrontPage as Component };
