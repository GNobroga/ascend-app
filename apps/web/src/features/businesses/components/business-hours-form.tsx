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
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useSetBusinessHours } from '../api/businesses.mutations';
import { businessQueries } from '../api/businesses.queries';
import { businessHoursSchema, type BusinessHoursValues } from '../schemas';
import { Weekday, type BusinessHour } from '../types';
import { DEFAULT_RANGE, toWeeklyHoursValues } from '../weekly-hours';
import { WeeklyHoursEditor, type WeeklyHoursLabels } from './weekly-hours-editor';

const LABELS: WeeklyHoursLabels = {
  open: 'Aberto',
  closed: 'Fechado',
  start: 'Abertura',
  end: 'Fechamento',
  copyTarget: 'os outros dias abertos',
  fillToCopy: 'Preencha a abertura e o fechamento para copiar',
};

const suggestedDay = (dayOfWeek: Weekday): BusinessHour => {
  if (dayOfWeek === Weekday.SUNDAY) return { dayOfWeek, isClosed: true, openTime: null, closeTime: null };
  if (dayOfWeek === Weekday.SATURDAY) {
    return { dayOfWeek, isClosed: false, openTime: DEFAULT_RANGE.openTime, closeTime: '13:00' };
  }
  return { dayOfWeek, isClosed: false, ...DEFAULT_RANGE };
};

const toFormValues = (hours: BusinessHour[]): BusinessHoursValues =>
  toWeeklyHoursValues((dayOfWeek) => hours.find((hour) => hour.dayOfWeek === dayOfWeek) ?? suggestedDay(dayOfWeek));

const toRequest = ({ hours }: BusinessHoursValues) => ({
  hours: hours.map((day) => ({
    dayOfWeek: day.dayOfWeek as Weekday,
    isClosed: day.isClosed,
    openTime: day.isClosed ? null : day.openTime,
    closeTime: day.isClosed ? null : day.closeTime,
  })),
});

type BusinessHoursFormProps = {
  businessId: string;
};

export function BusinessHoursForm({ businessId }: BusinessHoursFormProps) {
  const { data: hours } = useSuspenseQuery(businessQueries.hours(businessId));
  const isConfigured = hours.length > 0;

  const form = useForm<BusinessHoursValues>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: toFormValues(hours),
  });
  const { errors, isDirty } = useFormState({ control: form.control });
  const setHours = useSetBusinessHours(businessId, { onError: (error) => applyApiErrors(form, error) });

  const onSubmit = form.handleSubmit((values) => {
    setHours.mutate(toRequest(values), {
      onSuccess: (saved) => {
        form.reset(toFormValues(saved));
        toast.success('Horário de funcionamento salvo.');
      },
    });
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Os horários dos profissionais e da agenda online precisam caber dentro deste horário.
      </p>
      <Card>
        <CardContent className="flex flex-col gap-4">
          {!isConfigured && (
            <Alert>
              <InfoIcon />
              <AlertTitle>Horário ainda não definido</AlertTitle>
              <AlertDescription>
                Preenchemos uma sugestão. Ajuste os dias e horários e salve para liberar a agenda.
              </AlertDescription>
            </Alert>
          )}

          {serverError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <WeeklyHoursEditor form={form} labels={LABELS} />
        </CardContent>
      </Card>

      {(!isConfigured || isDirty) && (
        <SaveBar aria-label="Alterações não salvas">
          <SaveBarMessage>
            {isConfigured ? 'Você tem alterações não salvas.' : 'Salve para começar a usar este horário.'}
          </SaveBarMessage>
          <SaveBarActions>
            {isDirty && (
              <Button type="button" variant="ghost" disabled={setHours.isPending} onClick={() => form.reset()}>
                Descartar
              </Button>
            )}
            <Button type="submit" disabled={setHours.isPending}>
              {setHours.isPending && <Spinner />}
              Salvar horário
            </Button>
          </SaveBarActions>
        </SaveBar>
      )}
    </form>
  );
}
