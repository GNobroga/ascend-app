import { ListSkeleton } from '@packages/ui/components/skeletons';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { PaymentMethodsSettings } from '../components/payment-methods-settings';

function PaymentSettingsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return (
    <PageContainer>
      <PageHeader title="Pagamento" description="Formas de pagamento aceitas ao registrar o que o cliente pagou." />
      <QueryBoundary fallback={<ListSkeleton rows={4} avatar={false} />}>
        <PaymentMethodsSettings businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

export { PaymentSettingsPage as Component };
