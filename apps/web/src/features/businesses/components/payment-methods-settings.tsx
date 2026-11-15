import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@packages/ui/components/alert-dialog';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@packages/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Switch } from '@packages/ui/components/switch';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import {
  useCreatePaymentMethod,
  useRemovePaymentMethod,
  useUpdatePaymentMethod,
} from '../api/businesses.mutations';
import { businessQueries } from '../api/businesses.queries';
import { paymentMethodSchema, type PaymentMethodValues } from '../schemas';
import type { PaymentMethod } from '../types';

type PaymentMethodsSettingsProps = {
  businessId: string;
};

export function PaymentMethodsSettings({ businessId }: PaymentMethodsSettingsProps) {
  const { data: methods } = useSuspenseQuery(businessQueries.paymentMethods(businessId));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod>();
  const [removing, setRemoving] = useState<PaymentMethod | null>(null);
  const updateMethod = useUpdatePaymentMethod(businessId);

  const openForm = (method?: PaymentMethod) => {
    setEditing(method);
    setIsFormOpen(true);
  };

  const toggleActive = (method: PaymentMethod, isActive: boolean) =>
    updateMethod.mutate(
      { paymentMethodId: method.id, body: { isActive } },
      { onSuccess: () => toast.success(isActive ? `${method.name} ativada.` : `${method.name} desativada.`) },
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Formas aceitas ao registrar pagamentos. Desativar não afeta os pagamentos já lançados.
        </p>
        <Button type="button" onClick={() => openForm()}>
          <PlusIcon />
          Nova forma
        </Button>
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <ul className="flex flex-col divide-y">
            {methods.map((method) => (
              <li key={method.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="truncate">{method.name}</span>
                    {!method.isActive && <Badge variant="secondary">Inativa</Badge>}
                  </span>
                  {method.description && (
                    <span className="truncate text-sm text-muted-foreground">{method.description}</span>
                  )}
                </div>
                <Switch
                  aria-label={`Aceitar ${method.name}`}
                  checked={method.isActive}
                  disabled={updateMethod.isPending && updateMethod.variables.paymentMethodId === method.id}
                  onCheckedChange={(checked) => toggleActive(method, checked)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações de ${method.name}`} />}
                  >
                    <EllipsisIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-40">
                    <DropdownMenuItem onClick={() => openForm(method)}>
                      <PencilIcon />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setRemoving(method)}>
                      <Trash2Icon />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <PaymentMethodFormDialog
        businessId={businessId}
        method={editing}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
      <RemovePaymentMethodDialog
        businessId={businessId}
        method={removing}
        onOpenChange={(open) => !open && setRemoving(null)}
      />
    </div>
  );
}

type PaymentMethodFormDialogProps = {
  businessId: string;
  method?: PaymentMethod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PaymentMethodFormDialog({ businessId, method, open, onOpenChange }: PaymentMethodFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{method ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}</DialogTitle>
          <DialogDescription>Ex.: Vale-refeição, Transferência, Cartão de outra maquininha.</DialogDescription>
        </DialogHeader>
        {open && (
          <PaymentMethodForm
            key={method?.id ?? 'new'}
            businessId={businessId}
            method={method}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type PaymentMethodFormProps = {
  businessId: string;
  method?: PaymentMethod;
  onDone: () => void;
};

function PaymentMethodForm({ businessId, method, onDone }: PaymentMethodFormProps) {
  const form = useForm<PaymentMethodValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      name: method?.name ?? '',
      description: method?.description ?? '',
      isActive: method?.isActive ?? true,
    },
  });
  const { errors } = useFormState({ control: form.control });
  const handleError = (error: Error) => applyApiErrors(form, error);
  const createMethod = useCreatePaymentMethod(businessId, { onError: handleError });
  const updateMethod = useUpdatePaymentMethod(businessId, { onError: handleError });
  const isPending = createMethod.isPending || updateMethod.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const body = { ...values, description: values.description || null };
    const onSuccess = () => {
      toast.success(method ? 'Forma de pagamento atualizada.' : 'Forma de pagamento criada.');
      onDone();
    };
    if (method) {
      updateMethod.mutate({ paymentMethodId: method.id, body }, { onSuccess });
      return;
    }
    createMethod.mutate(body, { onSuccess });
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
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-method-name">Nome</FieldLabel>
              <Input {...field} id="payment-method-name" autoComplete="off" aria-invalid={fieldState.invalid} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-method-description">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Input
                {...field}
                id="payment-method-description"
                autoComplete="off"
                placeholder="Ex.: Chave Pix: CNPJ do negócio"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="payment-method-active">Aceita novos pagamentos</FieldLabel>
                <FieldDescription>Desligada, não aparece ao registrar um pagamento.</FieldDescription>
              </FieldContent>
              <Switch id="payment-method-active" checked={field.value} onCheckedChange={field.onChange} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {method ? 'Salvar alterações' : 'Criar forma'}
        </Button>
      </DialogFooter>
    </form>
  );
}

type RemovePaymentMethodDialogProps = {
  businessId: string;
  method: PaymentMethod | null;
  onOpenChange: (open: boolean) => void;
};

function RemovePaymentMethodDialog({ businessId, method, onOpenChange }: RemovePaymentMethodDialogProps) {
  const removeMethod = useRemovePaymentMethod(businessId);

  const confirm = () => {
    if (!method) return;
    removeMethod.mutate(method.id, {
      onSuccess: () => {
        toast.success('Forma de pagamento excluída.');
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={method !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{method?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Ela some da lista. Os pagamentos já lançados com ela continuam no histórico. Se for voltar a usar, prefira
            desativar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeMethod.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={removeMethod.isPending} onClick={confirm}>
            {removeMethod.isPending && <Spinner />}
            Excluir forma
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
