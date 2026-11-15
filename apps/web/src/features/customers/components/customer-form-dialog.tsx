import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@packages/ui/components/dialog';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Switch } from '@packages/ui/components/switch';
import { Textarea } from '@packages/ui/components/textarea';
import { useQuery } from '@tanstack/react-query';
import { CircleAlertIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatPhone, formatStoredPhone } from '@/shared/lib/masks';
import { useCreateCustomer, useUpdateCustomer } from '../api/customers.mutations';
import { customerQueries } from '../api/customers.queries';
import { toCustomerFormValues, toCustomerRequest } from '../customers';
import { customerSchema, type CustomerValues } from '../schemas';
import type { Customer } from '../types';

type CustomerFormDialogProps = {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSaved?: (customer: Customer) => void;
};

export function CustomerFormDialog({ businessId, open, onOpenChange, customer, onSaved }: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            {customer
              ? 'As observações são internas: o cliente não vê.'
              : 'Cadastro de balcão. Se o cliente agendar online com o mesmo e-mail, o cadastro é aproveitado.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CustomerForm
            key={customer?.id ?? 'new'}
            businessId={businessId}
            customer={customer}
            onDone={(saved) => {
              onOpenChange(false);
              onSaved?.(saved);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type PossibleDuplicate = {
  field: string;
  customerId: string;
};

type CustomerFormProps = {
  businessId: string;
  customer?: Customer;
  onDone: (customer: Customer) => void;
  onCancel: () => void;
};

function CustomerForm({ businessId, customer, onDone, onCancel }: CustomerFormProps) {
  const form = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: toCustomerFormValues(customer),
  });
  const { errors } = useFormState({ control: form.control });
  const [duplicates, setDuplicates] = useState<PossibleDuplicate[]>([]);

  const handleError = (error: Error) => {
    if (hasErrorCode(error, ErrorCode.CUSTOMER_POSSIBLE_DUPLICATE)) {
      setDuplicates(error.details.map(({ path, message }) => ({ field: path, customerId: message })));
      return;
    }
    applyApiErrors(form, error);
  };
  const createCustomer = useCreateCustomer(businessId, { onError: handleError });
  const updateCustomer = useUpdateCustomer(businessId, customer?.id ?? '', { onError: handleError });
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const save = (allowDuplicate: boolean) =>
    form.handleSubmit((values) => {
      setDuplicates([]);
      const { whatsappOptOut, ...body } = toCustomerRequest(values, allowDuplicate);
      const onSuccess = (saved: Customer) => {
        toast.success(customer ? 'Cliente atualizado.' : 'Cliente cadastrado.');
        onDone(saved);
      };
      if (customer) {
        updateCustomer.mutate({ ...body, whatsappOptOut }, { onSuccess });
        return;
      }
      createCustomer.mutate(body, { onSuccess });
    });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={save(false)} className="flex flex-col gap-6">
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {duplicates.length > 0 && (
          <Alert>
            <UsersIcon />
            <AlertTitle>Esse cliente já pode estar cadastrado</AlertTitle>
            <AlertDescription>
              <ul className="flex flex-col gap-1">
                {duplicates.map((duplicate) => (
                  <DuplicateMatch key={`${duplicate.field}-${duplicate.customerId}`} businessId={businessId} {...duplicate} />
                ))}
              </ul>
              <span>Confira antes de salvar. Se for outra pessoa (ex.: telefone da família), salve mesmo assim.</span>
            </AlertDescription>
          </Alert>
        )}

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="customer-name">Nome</FieldLabel>
              <Input
                {...field}
                id="customer-name"
                autoComplete="off"
                placeholder="Maria Souza"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="grid gap-x-3 gap-y-6 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-phone">
                  Telefone <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="customer-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="(11) 99999-0000"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => field.onChange(formatPhone(event.target.value))}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-email">
                  E-mail <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="customer-email"
                  type="email"
                  autoComplete="off"
                  placeholder="maria@email.com"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="customer-notes">
                Observações <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea
                {...field}
                id="customer-notes"
                rows={3}
                placeholder="Ex.: Prefere atendimento pela manhã."
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {customer && (
          <Controller
            control={form.control}
            name="whatsappOptOut"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="customer-whatsapp-opt-out">Não enviar WhatsApp</FieldLabel>
                  <FieldDescription>Ligue se o cliente pediu para não receber mensagens.</FieldDescription>
                </FieldContent>
                <Switch id="customer-whatsapp-opt-out" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        {duplicates.length > 0 ? (
          <Button type="button" disabled={isPending} onClick={(event) => void save(true)(event)}>
            {isPending && <Spinner />}
            Salvar mesmo assim
          </Button>
        ) : (
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner />}
            {customer ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

type DuplicateMatchProps = PossibleDuplicate & {
  businessId: string;
};

function DuplicateMatch({ businessId, field, customerId }: DuplicateMatchProps) {
  const { data: match } = useQuery(customerQueries.detail(businessId, customerId));
  const contact = field === 'phone' ? 'mesmo telefone' : 'mesmo e-mail';

  if (!match) return <li>Outro cliente com o {contact}.</li>;

  const detail = field === 'phone' && match.phone ? formatStoredPhone(match.phone) : match.email;
  return (
    <li>
      <span className="font-medium text-foreground">{match.name}</span> tem o {contact}
      {detail ? ` (${detail})` : ''}.
    </li>
  );
}
