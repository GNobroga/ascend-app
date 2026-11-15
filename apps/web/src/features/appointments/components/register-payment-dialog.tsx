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
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@packages/ui/components/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { useQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { businessQueries } from '@/features/businesses';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatCurrency } from '@/shared/lib/format-currency';
import { useRegisterPayment } from '../api/payments.mutations';
import { middayOf, todayKey } from '../calendar';
import { createPaymentSchema, type PaymentValues } from '../schemas';
import type { Appointment } from '../types';

type RegisterPaymentDialogProps = {
  businessId: string;
  appointment: Appointment;
  timeZone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RegisterPaymentDialog({
  businessId,
  appointment,
  timeZone,
  open,
  onOpenChange,
}: RegisterPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            {appointment.customer.name} · falta receber {formatCurrency(appointment.balance)}. Registrar não muda o
            status do agendamento.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RegisterPaymentForm
            businessId={businessId}
            appointment={appointment}
            timeZone={timeZone}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type RegisterPaymentFormProps = {
  businessId: string;
  appointment: Appointment;
  timeZone: string;
  onDone: () => void;
};

function RegisterPaymentForm({ businessId, appointment, timeZone, onDone }: RegisterPaymentFormProps) {
  const { data: methods = [] } = useQuery(businessQueries.paymentMethods(businessId));
  const activeMethods = methods.filter(({ isActive }) => isActive);
  const today = todayKey(timeZone);
  const form = useForm<PaymentValues>({
    resolver: zodResolver(createPaymentSchema(appointment.balance, formatCurrency(appointment.balance), today)),
    defaultValues: { paymentMethodId: '', amount: appointment.balance, paidOn: today, notes: '' },
  });
  const { errors } = useFormState({ control: form.control });
  const registerPayment = useRegisterPayment(businessId, appointment.id, {
    onError: (error) => applyApiErrors(form, error),
  });

  const onSubmit = form.handleSubmit(({ paidOn, ...values }) => {
    registerPayment.mutate(
      {
        ...values,
        notes: values.notes || null,
        ...(paidOn !== today && { paidAt: middayOf(paidOn, timeZone).toISOString() }),
      },
      {
        onSuccess: (payment) => {
          toast.success(`Pagamento de ${formatCurrency(payment.amount)} registrado.`);
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
          name="amount"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-amount">Valor recebido</FieldLabel>
              <InputGroup className="sm:w-48">
                <InputGroupAddon>
                  <InputGroupText>R$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  id="payment-amount"
                  type="number"
                  min={0.01}
                  max={appointment.balance}
                  step={0.01}
                  inputMode="decimal"
                  value={Number.isNaN(field.value) ? '' : field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  aria-invalid={fieldState.invalid}
                />
              </InputGroup>
              <FieldDescription>Para um sinal ou pagamento em partes, informe só o que entrou agora.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="paymentMethodId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-method">Forma de pagamento</FieldLabel>
              <Select
                items={activeMethods.map(({ id, name }) => ({ value: id, label: name }))}
                value={field.value || null}
                onValueChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
              >
                <SelectTrigger id="payment-method" ref={field.ref} className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Escolha a forma" />
                </SelectTrigger>
                <SelectContent>
                  {activeMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="paidOn"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-paid-on">Data do recebimento</FieldLabel>
              <Input
                {...field}
                id="payment-paid-on"
                type="date"
                max={today}
                className="sm:w-48"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>Mude só se o dinheiro entrou em outro dia.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-notes">
                Observação <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea
                {...field}
                id="payment-notes"
                rows={2}
                placeholder="Ex.: Sinal pago no Pix."
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={registerPayment.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={registerPayment.isPending}>
          {registerPayment.isPending && <Spinner />}
          Registrar
        </Button>
      </DialogFooter>
    </form>
  );
}
