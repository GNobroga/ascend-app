import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, CircleCheckIcon, CircleIcon, GiftIcon, HourglassIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ACTIVATION_STEPS, type ActivationStep } from '../activation';
import { subscriptionQueries } from '../api/subscriptions.queries';
import type { Subscription } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const withDaysLeft = (subscription: Subscription) => ({
  ...subscription,
  daysLeft: Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / MS_PER_DAY),
});

const daysLabel = (days: number) => (days === 1 ? 'Último dia' : `${days} dias`);

type TrialCardProps = {
  businessId: string;
  stepLinks: Partial<Record<ActivationStep, string>>;
};

export function TrialCard({ businessId, stepLinks }: TrialCardProps) {
  const { data: subscription } = useQuery({ ...subscriptionQueries.byBusiness(businessId), select: withDaysLeft });
  if (!subscription) return null;

  if (subscription.status === 'active') {
    return (
      <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-muted-foreground">
        <CircleCheckIcon className="size-4 text-primary" />
        Assinatura ativa
      </div>
    );
  }

  const { daysLeft } = subscription;
  const { steps, bonusDays, bonusGrantedAt } = subscription.activation;
  const completed = ACTIVATION_STEPS.filter(({ key }) => steps[key]).length;
  const nextStep = ACTIVATION_STEPS.find(({ key }) => !steps[key]);
  const nextStepLink = nextStep && stepLinks[nextStep.key];

  const isRestricted = subscription.access === 'restricted';

  if (isRestricted || daysLeft <= 0) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border bg-background p-3">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <HourglassIcon className="size-4 text-muted-foreground" />
          Teste encerrado
        </span>
        <span className="text-xs text-muted-foreground">
          {isRestricted
            ? 'Agendamento online e novos agendamentos estão pausados. Agenda, clientes e histórico continuam disponíveis.'
            : 'Seus dados continuam salvos.'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">Teste grátis</span>
        <span className="text-xs text-muted-foreground">{daysLabel(daysLeft)}</span>
      </div>

      {nextStep && (
        <>
          <div className="flex flex-col gap-1.5">
            <div aria-hidden="true" className="flex gap-1">
              {ACTIVATION_STEPS.map(({ key }) => (
                <span
                  key={key}
                  className={steps[key] ? 'h-1.5 flex-1 rounded-full bg-primary' : 'h-1.5 flex-1 rounded-full bg-muted'}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {completed} de {ACTIVATION_STEPS.length} passos concluídos
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs">
            <CircleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            {nextStepLink ? (
              <Link
                to={nextStepLink}
                className="group/next flex flex-1 items-start justify-between gap-1 font-medium outline-none hover:underline focus-visible:underline"
              >
                {nextStep.label}
                <ArrowRightIcon className="mt-0.5 size-3.5 shrink-0 transition-transform group-hover/next:translate-x-0.5" />
              </Link>
            ) : (
              <span className="font-medium">{nextStep.label}</span>
            )}
          </div>
        </>
      )}

      {!bonusGrantedAt && (
        <span className="flex items-start gap-2 text-xs text-muted-foreground">
          <GiftIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Ganhe +{bonusDays} dias de teste ao criar o primeiro agendamento.
        </span>
      )}
    </div>
  );
}
