import { ListSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { CategoriesList } from '../components/categories-list';

function CategoriesPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader title="Categorias" description="Como seus serviços se organizam no catálogo." />
      <QueryBoundary fallback={<ListSkeleton avatar={false} />}>
        <CategoriesList businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

export { CategoriesPage as Component };
