import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { FormSkeleton, ListSkeleton } from '@packages/ui/components/skeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@packages/ui/components/tabs';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CalendarClockIcon, CalendarOffIcon, ScissorsIcon, Trash2Icon, UserRoundIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BusinessMemberStatus } from '@/features/businesses';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { QueryBoundary } from '@/shared/components/query-boundary';
import { professionalQueries } from '../api/professionals.queries';
import { ProfessionalAssignmentsForm } from '../components/professional-assignments-form';
import { ProfessionalAvatar } from '../components/professional-avatar';
import { ProfessionalProfileForm } from '../components/professional-profile-form';
import { ProfessionalTimeOffs } from '../components/professional-time-offs';
import { ProfessionalWorkingHoursForm } from '../components/professional-working-hours-form';
import { RemoveProfessionalDialog } from '../components/remove-professional-dialog';
import { professionalsPath } from '../loaders';
import { isProfessionalTab, professionalSearchParams } from '../search-params';

function ProfessionalPage() {
  const { businessId, professionalId } = useParams();
  if (!businessId || !professionalId) return null;

  return <ProfessionalDetails businessId={businessId} professionalId={professionalId} />;
}

type ProfessionalDetailsProps = {
  businessId: string;
  professionalId: string;
};

function ProfessionalDetails({ businessId, professionalId }: ProfessionalDetailsProps) {
  const { data: professional } = useSuspenseQuery(professionalQueries.detail(businessId, professionalId));
  const [{ tab }, setSearchParams] = useQueryStates(professionalSearchParams);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <ProfessionalAvatar professional={professional} size="lg" />
            <span className="truncate">{professional.displayName}</span>
            {professional.memberStatus === BusinessMemberStatus.SUSPENDED && (
              <Badge variant="secondary">Suspenso</Badge>
            )}
          </span>
        }
        description={
          professional.memberStatus === BusinessMemberStatus.SUSPENDED
            ? 'O acesso desta pessoa está suspenso: ela não aparece na agenda nem recebe novos agendamentos.'
            : undefined
        }
        actions={
          <Button type="button" variant="ghost" onClick={() => setIsRemoveOpen(true)}>
            <Trash2Icon />
            Remover
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isProfessionalTab(value)) void setSearchParams({ tab: value });
        }}
      >
        <TabsList>
          <TabsTrigger value="profile">
            <UserRoundIcon />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <ScissorsIcon />
            Serviços e pacotes
          </TabsTrigger>
          <TabsTrigger value="hours">
            <CalendarClockIcon />
            Expediente
          </TabsTrigger>
          <TabsTrigger value="time-offs">
            <CalendarOffIcon />
            Ausências
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" keepMounted className="pt-4">
          <QueryBoundary fallback={<FormSkeleton />}>
            <ProfessionalProfileForm key={professional.id} businessId={businessId} professional={professional} />
          </QueryBoundary>
        </TabsContent>
        <TabsContent value="assignments" keepMounted className="pt-4">
          <QueryBoundary fallback={<FormSkeleton />}>
            <ProfessionalAssignmentsForm businessId={businessId} professional={professional} />
          </QueryBoundary>
        </TabsContent>
        <TabsContent value="hours" keepMounted className="pt-4">
          <QueryBoundary fallback={<FormSkeleton fields={7} />}>
            <ProfessionalWorkingHoursForm
              key={professional.id}
              businessId={businessId}
              professionalId={professional.id}
            />
          </QueryBoundary>
        </TabsContent>
        <TabsContent value="time-offs" className="pt-4">
          <QueryBoundary fallback={<ListSkeleton rows={3} avatar={false} />}>
            <ProfessionalTimeOffs businessId={businessId} professionalId={professional.id} />
          </QueryBoundary>
        </TabsContent>
      </Tabs>

      <RemoveProfessionalDialog
        businessId={businessId}
        professional={professional}
        open={isRemoveOpen}
        onOpenChange={setIsRemoveOpen}
        onRemoved={() => void navigate(professionalsPath(businessId), { replace: true })}
      />
    </PageContainer>
  );
}

export { ProfessionalPage as Component };
