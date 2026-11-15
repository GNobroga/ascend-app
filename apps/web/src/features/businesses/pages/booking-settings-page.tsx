import { FormSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { BookingSettingsForm } from '../components/booking-settings-form';

function BookingSettingsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader
        title="Agendamento"
        description="Grade de horários, antecedência, cancelamento, lembretes e bloqueio de clientes."
      />
      <QueryBoundary fallback={<FormSkeleton fields={6} />}>
        <BookingSettingsForm businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

export { BookingSettingsPage as Component };
