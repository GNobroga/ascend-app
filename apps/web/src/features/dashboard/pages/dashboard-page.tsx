import { TZDate } from '@date-fns/tz';
import { useSuspenseQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParams } from 'react-router';
import {
  appointmentsPath,
  PendingConfirmations,
  PendingConfirmationsBanner,
  TodayOverview,
  TodaySummary,
} from '@/features/appointments';
import { businessPath, businessQueries, canManageBusiness, settingsPath, useBusinessTimezone } from '@/features/businesses';
import { professionalQueries, professionalsPath } from '@/features/professionals';
import { ActivationChecklist } from '@/features/subscriptions';
import { userQueries } from '@/features/users';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { useNow } from '@/shared/hooks/use-now';
import { BusinessPerformance, PerformanceFilters } from '../components/business-performance';

function DashboardPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return <Dashboard businessId={businessId} />;
}

type DashboardProps = {
  businessId: string;
};

function Dashboard({ businessId }: DashboardProps) {
  const { data: user } = useSuspenseQuery(userQueries.me());
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const { data: businessDetail } = useSuspenseQuery(businessQueries.detail(businessId));
  const { data: professionals } = useSuspenseQuery(professionalQueries.list(businessId));
  const timeZone = useBusinessTimezone(businessId);
  const now = useNow();
  const business = businesses.find(({ id }) => id === businessId);
  const canManage = canManageBusiness(business?.roles ?? []);
  const firstName = user.name.split(' ')[0];
  const today = format(new TZDate(now, timeZone), "EEEE, d 'de' MMMM", { locale: ptBR });

  const header = (
    <PageHeader
      title={`Olá, ${firstName}`}
      description={
        <span className="first-letter:uppercase">
          {today}
          {business && ` · ${business.name}`}
        </span>
      }
      actions={
        canManage && <PerformanceFilters timeZone={timeZone} canManage={canManage} professionals={professionals} />
      }
    />
  );

  if (canManage) {
    return (
      <PageContainer size="full">
        {header}
        <ActivationChecklist
          businessId={businessId}
          stepLinks={{
            businessHours: settingsPath(businessId, 'hours'),
            services: `${businessPath(businessId)}/catalog/services`,
            professionals: professionalsPath(businessId),
            firstAppointment: appointmentsPath(businessId),
          }}
        />
        <PendingConfirmationsBanner businessId={businessId} />
        <BusinessPerformance
          businessId={businessId}
          businessSlug={businessDetail.slug}
          timeZone={timeZone}
          canManage={canManage}
          professionals={professionals}
          showHeader={false}
          aside={<TodaySummary businessId={businessId} />}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="full">
      {header}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TodayOverview businessId={businessId} />
        <PendingConfirmations businessId={businessId} />
      </div>

      <BusinessPerformance
        businessId={businessId}
        businessSlug={businessDetail.slug}
        timeZone={timeZone}
        canManage={canManage}
        professionals={professionals}
      />
    </PageContainer>
  );
}

export { DashboardPage as Component };
