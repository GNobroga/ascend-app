import { FormSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { BusinessHoursForm } from '../components/business-hours-form';

function HoursSettingsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader
        title="Horário de funcionamento"
        description="Quando o negócio abre. O expediente de cada profissional precisa caber nesse horário."
      />
      <QueryBoundary fallback={<FormSkeleton fields={7} />}>
        <BusinessHoursForm businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

export { HoursSettingsPage as Component };
