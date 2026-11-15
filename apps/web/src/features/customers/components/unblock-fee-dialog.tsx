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
import { Field, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
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
import { usePayUnblockFee } from '../api/customers.mutations';
import { unblockFeeSchema, type UnblockFeeValues } from '../schemas';
import type { Customer } from '../types';

type UnblockFeeDialogProps = {
  businessId: string;
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UnblockFeeDialog({ businessId, customer, open, onOpenChange }: UnblockFeeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar taxa de desbloqueio</DialogTitle>
          <DialogDescription>
            {customer.name} pagou {formatCurrency(customer.activeBlock?.feeAmount ?? 0)} por fora (Pix, balcão).
            Registrar desbloqueia na hora. Essa taxa não entra nos pagamentos de agendamento.
          </DialogDescription>
        </DialogHeader>
        {open && <UnblockFeeForm businessId={businessId} customer={customer} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

type UnblockFeeFormProps = {
  businessId: string;
  customer: Customer;
  onDone: () => void;
};

function UnblockFeeForm({ businessId, customer, onDone }: UnblockFeeFormProps) {
  const { data: methods = [] } = useQuery(businessQueries.paymentMethods(businessId));
  const activeMethods = methods.filter(({ isActive }) => isActive);
  const form = useForm<UnblockFeeValues>({
    resolver: zodResolver(unblockFeeSchema),
    defaultValues: { paymentMethodId: '', notes: '' },
  });
  const { errors } = useFormState({ control: form.control });
  const payFee = usePayUnblockFee(businessId, customer.id, { onError: (error) => applyApiErrors(form, error) });

  const onSubmit = form.handleSubmit((values) => {
    payFee.mutate(
      { ...values, notes: values.notes || null },
      {
        onSuccess: () => {
          toast.success(`${customer.name} desbloqueado.`);
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
          name="paymentMethodId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="unblock-fee-method">Forma de pagamento</FieldLabel>
              <Select
                items={activeMethods.map(({ id, name }) => ({ value: id, label: name }))}
                value={field.value || null}
                onValueChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
              >
                <SelectTrigger id="unblock-fee-method" ref={field.ref} className="w-full" aria-invalid={fieldState.invalid}>
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
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="unblock-fee-notes">
                Observação <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea {...field} id="unblock-fee-notes" rows={2} aria-invalid={fieldState.invalid} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={payFee.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={payFee.isPending}>
          {payFee.isPending && <Spinner />}
          Registrar e desbloquear
        </Button>
      </DialogFooter>
    </form>
  );
}
