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
import { FieldGroup } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { BusinessMemberRole, type BusinessMember } from '@/features/businesses';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useUpdateMember } from '../api/team.mutations';
import { memberRolesSchema, type MemberRolesValues } from '../schemas';
import { RoleCheckboxes } from './role-checkboxes';

type MemberRolesDialogProps = {
  businessId: string;
  member: BusinessMember | null;
  canManageOwners: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MemberRolesDialog({ businessId, member, canManageOwners, onOpenChange }: MemberRolesDialogProps) {
  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Papéis de {member?.name}</DialogTitle>
          <DialogDescription>Definem o que a pessoa pode ver e fazer no negócio.</DialogDescription>
        </DialogHeader>
        {member && (
          <MemberRolesForm
            key={member.id}
            businessId={businessId}
            member={member}
            canManageOwners={canManageOwners}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type MemberRolesFormProps = {
  businessId: string;
  member: BusinessMember;
  canManageOwners: boolean;
  onDone: () => void;
};

function MemberRolesForm({ businessId, member, canManageOwners, onDone }: MemberRolesFormProps) {
  const form = useForm<MemberRolesValues>({
    resolver: zodResolver(memberRolesSchema),
    defaultValues: { roles: member.roles },
  });
  const { errors } = useFormState({ control: form.control });
  const updateMember = useUpdateMember(businessId, { onError: (error) => applyApiErrors(form, error) });

  const onSubmit = form.handleSubmit((values) => {
    updateMember.mutate(
      { memberId: member.id, body: values },
      {
        onSuccess: () => {
          toast.success('Papéis atualizados.');
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
          name="roles"
          render={({ field, fieldState }) => (
            <RoleCheckboxes
              idPrefix="member-role"
              value={field.value}
              onChange={field.onChange}
              lockedRoles={canManageOwners ? [] : [BusinessMemberRole.OWNER]}
              error={fieldState.error}
            />
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={updateMember.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMember.isPending}>
          {updateMember.isPending && <Spinner />}
          Salvar papéis
        </Button>
      </DialogFooter>
    </form>
  );
}
