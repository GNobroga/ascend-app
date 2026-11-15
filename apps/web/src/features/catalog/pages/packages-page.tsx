import { ListSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { PackagesList } from '../components/packages-list';

function PackagesPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader title="Pacotes" description="Combinações de serviços vendidas juntas, com preço próprio." />
      <QueryBoundary fallback={<ListSkeleton avatar={false} />}>
        <PackagesList businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

export { PackagesPage as Component };
