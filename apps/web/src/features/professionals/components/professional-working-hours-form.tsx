import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { SaveBar, SaveBarActions, SaveBarMessage } from '@packages/ui/components/save-bar';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, InfoIcon } from 'lucide-react';
import { useForm, useFormState } from 'react-hook-form';
import { Link } from 'react-router';
import {
  settingsPath,
  businessQueries,
  DEFAULT_RANGE,
  toTimeRange,
  toWeeklyHoursValues,
  Weekday,
  WeeklyHoursEditor,
  type BusinessHour,
  type WeeklyHoursLabels,
  type WeeklyHoursReference,
  type WeeklyHoursValues,
} from '@/features/businesses';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useSetWorkingHours } from '../api/professionals.mutations';
import { professionalQueries } from '../api/professionals.queries';
import { createWorkingHoursSchema } from '../schemas';
import type { ProfessionalWorkingHour } from '../types';

const LABELS: WeeklyHoursLabels = {
  open: 'Trabalha',
  closed: 'Folga',
  start: 'Início',
  end: 'Fim',
  copyTarget: 'os outros dias de trabalho',
  fillToCopy: 'Preencha o início e o fim para copiar',
  locked: 'Negócio fechado',
};

const toReference = (businessHours: BusinessHour[]): WeeklyHoursReference | undefined =>
  businessHours.length > 0
    ? Object.fromEntries(businessHours.map((day) => [day.dayOfWeek, toTimeRange(day)]))
    : undefined;

const fallbackRange = (dayOfWeek: Weekday) => (dayOfWeek === Weekday.SUNDAY ? null : DEFAULT_RANGE);

const suggestedDay = (dayOfWeek: Weekday, reference: WeeklyHoursReference | undefined) => {
  const range = reference ? reference[dayOfWeek] : fallbackRange(dayOfWeek);
  return { isClosed: !range, openTime: range?.openTime ?? null, closeTime: range?.closeTime ?? null };
};

const toFormValues = (hours: ProfessionalWorkingHour[], reference: WeeklyHoursReference | undefined) =>
  toWeeklyHoursValues((dayOfWeek) => {
    const day = hours.find((hour) => hour.dayOfWeek === dayOfWeek);
    return day
      ? { isClosed: day.isDayOff, openTime: day.startTime, closeTime: day.endTime }
      : suggestedDay(dayOfWeek, reference);
  });

const toRequest = ({ hours }: WeeklyHoursValues) => ({
  workingHours: hours.map((day) => ({
    dayOfWeek: day.dayOfWeek as Weekday,
    isDayOff: day.isClosed,
    startTime: day.isClosed ? null : day.openTime,
    endTime: day.isClosed ? null : day.closeTime,
  })),
});

type ProfessionalWorkingHoursFormProps = {
  businessId: string;
  professionalId: string;
};

export function ProfessionalWorkingHoursForm({ businessId, professionalId }: ProfessionalWorkingHoursFormProps) {
  const { data: hours } = useSuspenseQuery(professionalQueries.workingHours(businessId, professionalId));
  const { data: businessHours } = useSuspenseQuery(businessQueries.hours(businessId));
  const reference = toReference(businessHours);
  const isConfigured = hours.length > 0;

  const form = useForm<WeeklyHoursValues>({
    resolver: zodResolver(createWorkingHoursSchema(reference)),
    defaultValues: toFormValues(hours, reference),
  });
  const { errors, isDirty } = useFormState({ control: form.control });

  const setWorkingHours = useSetWorkingHours(businessId, professionalId, {
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.VALIDATION_ERROR)) {
        form.setError('root.server', {
          message: 'O expediente precisa caber no horário de funcionamento do negócio. Revise os dias e horários.',
        });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setWorkingHours.mutate(toRequest(values), {
      onSuccess: (saved) => {
        form.reset(toFormValues(saved, reference));
        toast.success('Expediente salvo.');
      },
    });
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        A agenda online só oferece horários dentro do expediente. A faixa clara mostra quando o negócio está aberto.
      </p>
      <Card>
        <CardContent className="flex flex-col gap-4">
          {!reference && (
            <Alert>
              <InfoIcon />
              <AlertTitle>Horário do negócio não definido</AlertTitle>
              <AlertDescription>
                <span>
                  Defina primeiro o{' '}
                  <Link
                    to={settingsPath(businessId, 'hours')}
                    className="font-medium underline underline-offset-4"
                  >
                    horário de funcionamento
                  </Link>
                  , porque o expediente precisa caber nele.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {reference && !isConfigured && (
            <Alert>
              <InfoIcon />
              <AlertTitle>Expediente ainda não definido</AlertTitle>
              <AlertDescription>
                Preenchemos com o horário do negócio. Ajuste e salve para o profissional aparecer na agenda.
              </AlertDescription>
            </Alert>
          )}

          {serverError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <WeeklyHoursEditor form={form} labels={LABELS} reference={reference} />
        </CardContent>
      </Card>

      {(!isConfigured || isDirty) && (
        <SaveBar aria-label="Alterações não salvas">
          <SaveBarMessage>
            {isConfigured ? 'Você tem alterações não salvas.' : 'Salve para o profissional aparecer na agenda.'}
          </SaveBarMessage>
          <SaveBarActions>
            {isDirty && (
              <Button type="button" variant="ghost" disabled={setWorkingHours.isPending} onClick={() => form.reset()}>
                Descartar
              </Button>
            )}
            <Button type="submit" disabled={setWorkingHours.isPending}>
              {setWorkingHours.isPending && <Spinner />}
              Salvar expediente
            </Button>
          </SaveBarActions>
        </SaveBar>
      )}
    </form>
  );
}
