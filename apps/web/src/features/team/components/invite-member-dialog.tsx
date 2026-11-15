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
import { Input } from '@packages/ui/components/input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { BusinessMemberRole } from '@/features/businesses';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useCreateInvitation } from '../api/team.mutations';
import { inviteSchema, type InviteValues } from '../schemas';
import { RoleCheckboxes } from './role-checkboxes';

type InviteMemberDialogProps = {
  businessId: string;
  canManageOwners: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteMemberDialog({ businessId, canManageOwners, open, onOpenChange }: InviteMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar para a equipe</DialogTitle>
          <DialogDescription>
            Enviamos um link por e-mail. A pessoa entra com esse e-mail, cria a conta se ainda não tiver, e aceita o
            convite.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <InviteMemberForm
            businessId={businessId}
            canManageOwners={canManageOwners}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type InviteMemberFormProps = {
  businessId: string;
  canManageOwners: boolean;
  onDone: () => void;
};

function InviteMemberForm({ businessId, canManageOwners, onDone }: InviteMemberFormProps) {
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', roles: [BusinessMemberRole.PROFESSIONAL] },
  });
  const { errors } = useFormState({ control: form.control });
  const createInvitation = useCreateInvitation(businessId, {
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.MEMBER_ALREADY_EXISTS)) {
        form.setError('email', { message: error.message }, { shouldFocus: true });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createInvitation.mutate(values, {
      onSuccess: (invitation) => {
        toast.success('Convite enviado.', { description: `Mandamos o link para ${invitation.email}.` });
        onDone();
      },
    });
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
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
              <Input
                {...field}
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="maria@email.com"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="roles"
          render={({ field, fieldState }) => (
            <RoleCheckboxes
              idPrefix="invite-role"
              value={field.value}
              onChange={field.onChange}
              lockedRoles={canManageOwners ? [] : [BusinessMemberRole.OWNER]}
              error={fieldState.error}
            />
          )}
        />

        <p className="text-sm text-muted-foreground">
          Para a pessoa atender clientes, depois que ela aceitar, adicione-a em Profissionais.
        </p>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={createInvitation.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createInvitation.isPending}>
          {createInvitation.isPending && <Spinner />}
          Enviar convite
        </Button>
      </DialogFooter>
    </form>
  );
}
