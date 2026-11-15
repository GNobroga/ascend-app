import { Button } from '@packages/ui/components/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { ListSkeleton } from '@packages/ui/components/skeletons';
import { Spinner } from '@packages/ui/components/spinner';
import { Tabs, TabsList, TabsTrigger } from '@packages/ui/components/tabs';
import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, HistoryIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import { useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import type { MyAppointmentScope } from '../api/my-appointments.api';
import { myAppointmentQueries } from '../api/my-appointments.queries';
import { CancelMyAppointmentDialog } from '../components/cancel-my-appointment-dialog';
import { MyAppointmentCard } from '../components/my-appointment-card';
import { ReviewAppointmentDialog } from '../components/review-appointment-dialog';
import { MY_APPOINTMENT_SCOPES, myAppointmentsSearchParams } from '../search-params';
import type { MyAppointment } from '../types';

const SCOPE_LABELS: Record<MyAppointmentScope, string> = {
  upcoming: 'Próximos',
  past: 'Anteriores',
};

const isScope = (value: unknown): value is MyAppointmentScope =>
  MY_APPOINTMENT_SCOPES.some((scope) => scope === value);

function MyAppointmentsPage() {
  const { appointmentId } = useParams();
  const [{ scope: scopeParam }, setSearchParams] = useQueryStates(myAppointmentsSearchParams);
  const scope = scopeParam ?? 'upcoming';

  return (
    <PageContainer size="narrow">
      <PageHeader title="Meus agendamentos" description="Seus horários em todos os negócios." />
      <Tabs value={scope} onValueChange={(value) => isScope(value) && void setSearchParams({ scope: value })}>
        <TabsList>
          {MY_APPOINTMENT_SCOPES.map((value) => (
            <TabsTrigger key={value} value={value}>
              {SCOPE_LABELS[value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <QueryBoundary key={scope} fallback={<ListSkeleton rows={3} />}>
        <MyAppointmentsList scope={scope} highlightedId={appointmentId} />
      </QueryBoundary>
    </PageContainer>
  );
}

type MyAppointmentsListProps = {
  scope: MyAppointmentScope;
  highlightedId: string | undefined;
};

function MyAppointmentsList({ scope, highlightedId }: MyAppointmentsListProps) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    myAppointmentQueries.list(scope),
  );
  const [cancelling, setCancelling] = useState<MyAppointment | null>(null);
  const [reviewing, setReviewing] = useState<MyAppointment | null>(null);
  const appointments = data.pages.flatMap((page) => page.data);

  if (appointments.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">{scope === 'upcoming' ? <CalendarDaysIcon /> : <HistoryIcon />}</EmptyMedia>
          <EmptyTitle>{scope === 'upcoming' ? 'Nenhum horário marcado' : 'Nenhum agendamento anterior'}</EmptyTitle>
          <EmptyDescription>
            {scope === 'upcoming'
              ? 'Quando você agendar pela página de um negócio, o horário aparece aqui.'
              : 'Seus atendimentos passados e cancelados aparecem aqui.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {appointments.map((appointment) => (
          <li key={appointment.id}>
            <MyAppointmentCard
              appointment={appointment}
              highlighted={appointment.id === highlightedId}
              onCancel={setCancelling}
              onReview={setReviewing}
            />
          </li>
        ))}
      </ul>

      {hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage && <Spinner />}
          Ver mais
        </Button>
      )}

      <CancelMyAppointmentDialog appointment={cancelling} onOpenChange={(open) => !open && setCancelling(null)} />
      <ReviewAppointmentDialog appointment={reviewing} onOpenChange={(open) => !open && setReviewing(null)} />
    </div>
  );
}

export { MyAppointmentsPage as Component };
