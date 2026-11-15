import { ListSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { ProfessionalsList } from '../components/professionals-list';

function ProfessionalsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader title="Profissionais" description="Quem atende os clientes, com os serviços e horários de cada um." />
      <QueryBoundary fallback={<ListSkeleton />}>
        <ProfessionalsList businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

export { ProfessionalsPage as Component };
