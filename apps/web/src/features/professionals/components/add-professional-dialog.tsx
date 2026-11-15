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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, InfoIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { businessQueries, BusinessMemberStatus } from '@/features/businesses';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useCreateProfessional } from '../api/professionals.mutations';
import { professionalsPath } from '../loaders';
import { createProfessionalSchema, type CreateProfessionalValues } from '../schemas';
import { CommissionInput } from './commission-input';

type AddProfessionalDialogProps = {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddProfessionalDialog({ businessId, open, onOpenChange }: AddProfessionalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar profissional</DialogTitle>
          <DialogDescription>Escolha quem da equipe atende clientes. Depois você define serviços e horários.</DialogDescription>
        </DialogHeader>
        {open && <AddProfessionalForm businessId={businessId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

type AddProfessionalFormProps = {
  businessId: string;
  onDone: () => void;
};

function AddProfessionalForm({ businessId, onDone }: AddProfessionalFormProps) {
  const { data: members } = useSuspenseQuery(businessQueries.members(businessId));
  const navigate = useNavigate();
  const candidates = members.filter(
    (member) => member.professionalId === null && member.status === BusinessMemberStatus.ACTIVE,
  );
  const memberItems = candidates.map((member) => ({ value: member.id, label: member.name }));

  const form = useForm<CreateProfessionalValues>({
    resolver: zodResolver(createProfessionalSchema),
    defaultValues: {
      memberId: candidates.length === 1 ? (candidates[0]?.id ?? '') : '',
      displayName: candidates.length === 1 ? (candidates[0]?.name ?? '') : '',
      commissionPercent: 0,
    },
  });
  const { errors } = useFormState({ control: form.control });

  const createProfessional = useCreateProfessional(businessId, {
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.PROFESSIONAL_ALREADY_EXISTS)) {
        form.setError('memberId', { message: 'Essa pessoa já é profissional.' });
        return;
      }
      if (hasErrorCode(error, ErrorCode.MEMBER_NOT_FOUND)) {
        form.setError('memberId', { message: 'Essa pessoa não faz mais parte da equipe.' });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const selectMember = (memberId: string) => {
    const previous = candidates.find(({ id }) => id === form.getValues('memberId'));
    const next = candidates.find(({ id }) => id === memberId);
    form.setValue('memberId', memberId, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });

    const displayName = form.getValues('displayName');
    if (next && (!displayName || displayName === previous?.name)) {
      form.setValue('displayName', next.name, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    createProfessional.mutate(
      { ...values, bio: null },
      {
        onSuccess: (professional) => {
          toast.success('Profissional adicionado.');
          onDone();
          void navigate(`${professionalsPath(businessId)}/${professional.id}?tab=assignments`);
        },
      },
    );
  });

  if (candidates.length === 0) {
    return (
      <>
        <Alert>
          <InfoIcon />
          <AlertDescription>
            Todos da equipe já são profissionais. Para adicionar outra pessoa, ela precisa entrar na equipe por
            convite.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone}>
            Fechar
          </Button>
        </DialogFooter>
      </>
    );
  }

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
          name="memberId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="professional-member">Quem vai atender</FieldLabel>
              <Select
                items={memberItems}
                value={field.value || null}
                onValueChange={(value) => {
                  if (typeof value === 'string') selectMember(value);
                }}
              >
                <SelectTrigger
                  id="professional-member"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                >
                  <SelectValue placeholder="Escolha alguém da equipe" />
                </SelectTrigger>
                <SelectContent>
                  {memberItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
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
          name="displayName"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="professional-display-name">Nome de exibição</FieldLabel>
              <Input
                {...field}
                id="professional-display-name"
                placeholder="Ex.: Maria Souza"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>É o nome que os clientes veem ao agendar.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="commissionPercent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="professional-commission">Comissão padrão</FieldLabel>
              <CommissionInput
                id="professional-commission"
                ref={field.ref}
                name={field.name}
                onBlur={field.onBlur}
                value={field.value}
                onValueChange={field.onChange}
                aria-invalid={fieldState.invalid}
                groupClassName="sm:w-40"
              />
              <FieldDescription>Vale para todos os serviços, a menos que você defina outra em cada um.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={createProfessional.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createProfessional.isPending}>
          {createProfessional.isPending && <Spinner />}
          Adicionar profissional
        </Button>
      </DialogFooter>
    </form>
  );
}
