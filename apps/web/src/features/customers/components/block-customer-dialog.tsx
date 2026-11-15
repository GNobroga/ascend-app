import { TZDate } from '@date-fns/tz';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@packages/ui/components/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { businessQueries } from '@/features/businesses';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatCurrency } from '@/shared/lib/format-currency';
import { useBlockCustomer } from '../api/customers.mutations';
import { endOfDayIso } from '../customers';
import { blockCustomerSchema, type BlockCustomerValues } from '../schemas';
import { CustomerBlockType, type Customer } from '../types';

const DEFAULT_BLOCK_DAYS = 30;

const MAX_BLOCK_DAYS = 365;

const isBlockType = (value: unknown): value is CustomerBlockType =>
  Object.values(CustomerBlockType).some((type) => type === value);

type BlockCustomerDialogProps = {
  businessId: string;
  timeZone: string;
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BlockCustomerDialog({ businessId, timeZone, customer, open, onOpenChange }: BlockCustomerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear {customer.name}</DialogTitle>
          <DialogDescription>
            O cliente deixa de agendar online neste negócio. A equipe continua podendo agendar por ele.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <BlockCustomerForm
            businessId={businessId}
            timeZone={timeZone}
            customer={customer}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type BlockCustomerFormProps = {
  businessId: string;
  timeZone: string;
  customer: Customer;
  onDone: () => void;
};

function BlockCustomerForm({ businessId, timeZone, customer, onDone }: BlockCustomerFormProps) {
  const { data: settings } = useQuery(businessQueries.settings(businessId));
  const unblockFee = settings?.unblockFee ?? 0;
  const today = TZDate.tz(timeZone);
  const minDate = format(addDays(today, 1), 'yyyy-MM-dd');
  const maxDate = format(addDays(today, MAX_BLOCK_DAYS), 'yyyy-MM-dd');

  const form = useForm<BlockCustomerValues>({
    resolver: zodResolver(blockCustomerSchema),
    defaultValues: {
      type: CustomerBlockType.TEMPORARY,
      until: format(addDays(today, DEFAULT_BLOCK_DAYS), 'yyyy-MM-dd'),
      reason: customer.noShowCount > 0 ? `Faltou ${customer.noShowCount} ${customer.noShowCount === 1 ? 'vez' : 'vezes'}.` : '',
    },
  });
  const { errors } = useFormState({ control: form.control });
  const type = useWatch({ control: form.control, name: 'type' });
  const blockCustomer = useBlockCustomer(businessId, customer.id, { onError: (error) => applyApiErrors(form, error) });

  const onSubmit = form.handleSubmit((values) => {
    blockCustomer.mutate(
      {
        type: values.type,
        until: values.type === CustomerBlockType.TEMPORARY ? endOfDayIso(values.until, timeZone) : undefined,
        reason: values.reason || null,
      },
      {
        onSuccess: () => {
          toast.success(`${customer.name} bloqueado para agendar online.`);
          onDone();
        },
      },
    );
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Field>
              <FieldLabel id="block-type-label">Tipo de bloqueio</FieldLabel>
              <ToggleGroup
                aria-labelledby="block-type-label"
                variant="outline"
                spacing={0}
                value={[field.value]}
                onValueChange={([next]) => {
                  if (isBlockType(next)) field.onChange(next);
                }}
              >
                <ToggleGroupItem value={CustomerBlockType.TEMPORARY} className="px-4">
                  Até uma data
                </ToggleGroupItem>
                <ToggleGroupItem value={CustomerBlockType.FEE} className="px-4" disabled={unblockFee <= 0}>
                  Até pagar a taxa
                </ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>
                {unblockFee > 0
                  ? `A taxa de desbloqueio é ${formatCurrency(unblockFee)}, definida nas regras de agendamento.`
                  : 'Para bloquear até pagar uma taxa, defina a taxa de desbloqueio nas regras de agendamento.'}
              </FieldDescription>
            </Field>
          )}
        />

        {type === CustomerBlockType.TEMPORARY && (
          <Controller
            control={form.control}
            name="until"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="block-until">Bloqueado até</FieldLabel>
                <Input
                  {...field}
                  id="block-until"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  className="sm:w-48"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>O bloqueio acaba sozinho no fim desse dia. Até {MAX_BLOCK_DAYS} dias.</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}

        <Controller
          control={form.control}
          name="reason"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="block-reason">
                Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea {...field} id="block-reason" rows={2} aria-invalid={fieldState.invalid} />
              <FieldDescription>Só a equipe vê.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={blockCustomer.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" disabled={blockCustomer.isPending}>
          {blockCustomer.isPending && <Spinner />}
          Bloquear
        </Button>
      </DialogFooter>
    </form>
  );
}
