import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { ListSkeleton } from '@packages/ui/components/skeletons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleCheckIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { formatStoredPhone } from '@/shared/lib/masks';
import { customerQueries } from '../api/customers.queries';
import { CustomerRow } from '../components/customer-row';
import { customerPath } from '../loaders';
import { DuplicateField, type PossibleDuplicateGroup } from '../types';

const groupTitle = ({ field, value }: PossibleDuplicateGroup) =>
  field === DuplicateField.PHONE ? `Mesmo telefone: ${formatStoredPhone(value)}` : `Mesmo e-mail: ${value}`;

function PossibleDuplicatesPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return <PossibleDuplicates businessId={businessId} />;
}

type PossibleDuplicatesProps = {
  businessId: string;
};

function PossibleDuplicates({ businessId }: PossibleDuplicatesProps) {
  return (
    <PageContainer>
      <PageHeader
        title="Possíveis duplicados"
        description="Clientes com o mesmo telefone ou e-mail. Confira cada grupo e exclua o cadastro repetido, se for o caso."
      />

      <QueryBoundary fallback={<ListSkeleton rows={4} />}>
        <DuplicateGroups businessId={businessId} />
      </QueryBoundary>
    </PageContainer>
  );
}

function DuplicateGroups({ businessId }: PossibleDuplicatesProps) {
  const { data: groups } = useSuspenseQuery(customerQueries.possibleDuplicates(businessId));

  if (groups.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleCheckIcon />
          </EmptyMedia>
          <EmptyTitle>Nenhum duplicado</EmptyTitle>
          <EmptyDescription>Nenhum cliente divide telefone ou e-mail com outro.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={`${group.field}-${group.value}`} className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{groupTitle(group)}</CardTitle>
          </CardHeader>
          <CardContent className="border-t px-0">
            <ul className="flex flex-col divide-y">
              {group.customers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} to={customerPath(businessId, customer.id)} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { PossibleDuplicatesPage as Component };
