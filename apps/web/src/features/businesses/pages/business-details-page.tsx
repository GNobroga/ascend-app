import { FormSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { BusinessDetailsForm } from '../components/business-details-form';
import { BusinessGallery } from '../components/business-gallery';
import { SocialLinksForm } from '../components/social-links-form';

function BusinessDetailsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader title="Dados do negócio" description="Nome, logo, fotos, contato, redes sociais, endereço e fuso horário." />
      <BusinessDetailsForm businessId={businessId} />
      <QueryBoundary fallback={<FormSkeleton fields={3} />}>
        <SocialLinksForm businessId={businessId} />
      </QueryBoundary>
      <BusinessGallery businessId={businessId} />
    </PageContainer>
  );
}

export { BusinessDetailsPage as Component };
