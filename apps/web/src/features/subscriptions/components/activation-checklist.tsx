import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/components/card';
import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, CircleCheckIcon, CircleIcon, GiftIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ACTIVATION_STEPS, type ActivationStep } from '../activation';
import { subscriptionQueries } from '../api/subscriptions.queries';

type ActivationChecklistProps = {
  businessId: string;
  stepLinks: Partial<Record<ActivationStep, string>>;
};

export function ActivationChecklist({ businessId, stepLinks }: ActivationChecklistProps) {
  const { data: subscription } = useQuery(subscriptionQueries.byBusiness(businessId));
  if (!subscription || subscription.status !== 'trialing') return null;

  const { steps, bonusDays, bonusGrantedAt } = subscription.activation;
  const completed = ACTIVATION_STEPS.filter(({ key }) => steps[key]).length;
  if (completed === ACTIVATION_STEPS.length) return null;

  const nextKey = ACTIVATION_STEPS.find(({ key }) => !steps[key])?.key;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Deixe o negócio pronto para agendar
          <Badge variant="secondary">
            {completed} de {ACTIVATION_STEPS.length}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          {bonusGrantedAt ? (
            'Você já ganhou os dias extras de teste. Falta pouco!'
          ) : (
            <>
              <GiftIcon className="size-4 text-primary" />
              Ganhe +{bonusDays} dias de teste ao fazer o primeiro agendamento.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ol className="flex flex-col divide-y">
          {ACTIVATION_STEPS.map(({ key, label, description }) => {
            const isDone = steps[key];
            const link = stepLinks[key];
            const isNext = key === nextKey;
            return (
              <li key={key} className="flex items-center gap-3 px-6 py-3">
                {isDone ? (
                  <CircleCheckIcon className="size-5 shrink-0 text-primary" aria-label="Concluído" />
                ) : (
                  <CircleIcon className="size-5 shrink-0 text-muted-foreground" aria-label="Pendente" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn('font-medium', isDone && 'text-muted-foreground line-through')}>{label}</span>
                  {!isDone && <span className="text-sm text-muted-foreground">{description}</span>}
                </span>
                {!isDone && link && (
                  <Button
                    size="sm"
                    variant={isNext ? 'default' : 'ghost'}
                    nativeButton={false}
                    render={<Link to={link} />}
                  >
                    {isNext ? 'Fazer agora' : 'Abrir'}
                    <ArrowRightIcon />
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
