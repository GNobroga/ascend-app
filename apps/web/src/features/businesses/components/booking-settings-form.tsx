import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { FieldDescription, FieldError, FieldLabel } from '@packages/ui/components/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@packages/ui/components/input-group';
import { SaveBar, SaveBarActions, SaveBarMessage } from '@packages/ui/components/save-bar';
import {
  SettingsSection as Section,
  SettingsSectionContent,
  SettingsSectionDescription,
  SettingsSectionHeader,
  SettingsSectionTitle,
} from '@packages/ui/components/settings-section';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Switch } from '@packages/ui/components/switch';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Controller, useForm, useFormState, type Control, type FieldError as FormFieldError } from 'react-hook-form';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatHours, formatMinutes } from '@/shared/lib/format-duration';
import { useUpdateBusinessSettings } from '../api/businesses.mutations';
import { businessQueries } from '../api/businesses.queries';
import { bookingSettingsSchema, type BookingSettingsValues } from '../schemas';

type SelectOption = {
  value: number;
  label: string;
};

type SelectSettingName =
  | 'slotIntervalMinutes'
  | 'bufferMinutes'
  | 'minimumAdvanceBookingMinutes'
  | 'cancellationLimitHours'
  | 'reminderHoursBefore';

const minuteOptions = (values: number[], zeroLabel?: string): SelectOption[] =>
  values.map((value) => ({ value, label: value === 0 && zeroLabel ? zeroLabel : formatMinutes(value) }));

const hourOptions = (values: number[], zeroLabel: string): SelectOption[] =>
  values.map((value) => ({ value, label: value === 0 ? zeroLabel : formatHours(value) }));

const SELECT_OPTIONS: Record<SelectSettingName, SelectOption[]> = {
  slotIntervalMinutes: minuteOptions([5, 10, 15, 20, 30, 45, 60, 90, 120]),
  bufferMinutes: minuteOptions([0, 5, 10, 15, 20, 30], 'Sem pausa'),
  minimumAdvanceBookingMinutes: minuteOptions([0, 30, 60, 120, 240, 720, 1440, 2880], 'Sem mínimo'),
  cancellationLimitHours: hourOptions([0, 1, 2, 6, 12, 24, 48, 72], 'A qualquer momento'),
  reminderHoursBefore: hourOptions([0, 1, 2, 6, 12, 24, 48], 'Não enviar'),
};

const FORMAT_CUSTOM_VALUE: Record<SelectSettingName, (value: number) => string> = {
  slotIntervalMinutes: formatMinutes,
  bufferMinutes: formatMinutes,
  minimumAdvanceBookingMinutes: formatMinutes,
  cancellationLimitHours: formatHours,
  reminderHoursBefore: formatHours,
};

const optionsWithValue = (name: SelectSettingName, value: number) => {
  const options = SELECT_OPTIONS[name];
  if (options.some((option) => option.value === value)) return options;
  return [...options, { value, label: FORMAT_CUSTOM_VALUE[name](value) }].toSorted((a, b) => a.value - b.value);
};

type BookingSettingsFormProps = {
  businessId: string;
};

export function BookingSettingsForm({ businessId }: BookingSettingsFormProps) {
  const { data: settings } = useSuspenseQuery(businessQueries.settings(businessId));

  const form = useForm<BookingSettingsValues>({
    resolver: zodResolver(bookingSettingsSchema),
    defaultValues: settings,
  });
  const { errors, isDirty } = useFormState({ control: form.control });
  const updateSettings = useUpdateBusinessSettings(businessId, {
    onError: (error) => applyApiErrors(form, error),
  });

  const onSubmit = form.handleSubmit((values) => {
    updateSettings.mutate(values, {
      onSuccess: (saved) => {
        form.reset(saved);
        toast.success('Configurações de agendamento salvas.');
      },
    });
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-8">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <SettingsSection title="Grade de horários" description="Como os horários livres aparecem na agenda.">
        <SelectSetting
          control={form.control}
          name="slotIntervalMinutes"
          label="Intervalo entre horários"
          description="Distância entre um horário oferecido e o próximo. Ex.: 30 min oferece 09:00, 09:30, 10:00…"
        />
        <SelectSetting
          control={form.control}
          name="bufferMinutes"
          label="Pausa entre atendimentos"
          description="Tempo livre entre dois atendimentos do mesmo profissional, para limpeza ou preparo."
        />
      </SettingsSection>

      <SettingsSection title="Agendamento online" description="Regras para quando o cliente agenda pela sua página.">
        <SelectSetting
          control={form.control}
          name="minimumAdvanceBookingMinutes"
          label="Antecedência mínima"
          description="O cliente não consegue agendar horários que comecem antes disso."
        />
        <Controller
          control={form.control}
          name="maximumAdvanceBookingDays"
          render={({ field, fieldState }) => (
            <SettingRow
              htmlFor="maximumAdvanceBookingDays"
              label="Antecedência máxima"
              description="Até quantos dias à frente o cliente pode agendar."
              error={fieldState.error}
            >
              <InputGroup className="sm:w-48">
                <InputGroupInput
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  id="maximumAdvanceBookingDays"
                  type="number"
                  min={1}
                  max={365}
                  inputMode="numeric"
                  value={Number.isNaN(field.value) ? '' : field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  aria-invalid={fieldState.invalid}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>dias</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </SettingRow>
          )}
        />
        <Controller
          control={form.control}
          name="autoConfirmOnlineBookings"
          render={({ field }) => (
            <SettingRow
              htmlFor="autoConfirmOnlineBookings"
              label="Confirmar automaticamente"
              description="Desligado, os agendamentos online ficam pendentes até a equipe confirmar."
            >
              <Switch id="autoConfirmOnlineBookings" checked={field.value} onCheckedChange={field.onChange} />
            </SettingRow>
          )}
        />
      </SettingsSection>

      <SettingsSection title="Cancelamento e lembretes" description="O que acontece depois que o cliente agenda.">
        <SelectSetting
          control={form.control}
          name="cancellationLimitHours"
          label="Prazo para o cliente cancelar"
          description="Até quanto tempo antes do início o cliente pode cancelar sozinho."
        />
        <SelectSetting
          control={form.control}
          name="reminderHoursBefore"
          label="Lembrete por e-mail"
          description="Quanto tempo antes do início o cliente recebe o lembrete. Vale só para agendamentos confirmados."
        />
      </SettingsSection>

      <SettingsSection title="Bloqueio de clientes" description="Para clientes que faltam com frequência.">
        <Controller
          control={form.control}
          name="unblockFee"
          render={({ field, fieldState }) => (
            <SettingRow
              htmlFor="unblockFee"
              label="Taxa de desbloqueio"
              description="Valor para o cliente sair de um bloqueio por taxa. Vale para os próximos bloqueios; R$ 0,00 desativa esse tipo de bloqueio."
              error={fieldState.error}
            >
              <InputGroup className="sm:w-48">
                <InputGroupAddon>
                  <InputGroupText>R$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  id="unblockFee"
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  value={Number.isNaN(field.value) ? '' : field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  aria-invalid={fieldState.invalid}
                />
              </InputGroup>
            </SettingRow>
          )}
        />
      </SettingsSection>

      {isDirty && (
        <SaveBar aria-label="Alterações não salvas">
          <SaveBarMessage>Você tem alterações não salvas.</SaveBarMessage>
          <SaveBarActions>
            <Button type="button" variant="ghost" disabled={updateSettings.isPending} onClick={() => form.reset()}>
              Descartar
            </Button>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Spinner />}
              Salvar alterações
            </Button>
          </SaveBarActions>
        </SaveBar>
      )}
    </form>
  );
}

type SettingsSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Section>
      <SettingsSectionHeader>
        <SettingsSectionTitle>{title}</SettingsSectionTitle>
        <SettingsSectionDescription>{description}</SettingsSectionDescription>
      </SettingsSectionHeader>
      <SettingsSectionContent>
        <Card>
          <CardContent className="flex flex-col divide-y">{children}</CardContent>
        </Card>
      </SettingsSectionContent>
    </Section>
  );
}

type SettingRowProps = {
  htmlFor: string;
  label: string;
  description: string;
  error?: FormFieldError;
  children: ReactNode;
};

function SettingRow({ htmlFor, label, description, error, children }: SettingRowProps) {
  return (
    <div
      data-invalid={Boolean(error)}
      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
    >
      <div className="flex max-w-xl flex-col gap-1">
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:items-end">
        {children}
        <FieldError errors={[error]} />
      </div>
    </div>
  );
}

type SelectSettingProps = {
  control: Control<BookingSettingsValues>;
  name: SelectSettingName;
  label: string;
  description: string;
};

function SelectSetting({ control, name, label, description }: SelectSettingProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const options = optionsWithValue(name, field.value);

        return (
          <SettingRow htmlFor={name} label={label} description={description} error={fieldState.error}>
            <Select
              items={options}
              value={field.value}
              onValueChange={(value) => {
                if (typeof value === 'number') field.onChange(value);
              }}
            >
              <SelectTrigger
                id={name}
                ref={field.ref}
                onBlur={field.onBlur}
                className="w-full sm:w-48"
                aria-invalid={fieldState.invalid}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        );
      }}
    />
  );
}
