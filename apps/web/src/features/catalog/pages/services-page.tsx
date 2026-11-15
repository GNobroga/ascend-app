import { ListSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { ServicesList } from '../components/services-list';

function ServicesPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader title="Serviços" description="O que seus clientes podem agendar, com preço e duração." />
      <QueryBoundary fallback={<ListSkeleton avatar={false} />}>
        <ServicesList businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

export { ServicesPage as Component };
