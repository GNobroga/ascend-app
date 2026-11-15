import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@packages/ui/components/alert-dialog';
import { Button } from '@packages/ui/components/button';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import type { BusinessMember } from '@/features/businesses';
import { useRemoveMember } from '../api/team.mutations';

type RemoveMemberDialogProps = {
  businessId: string;
  member: BusinessMember | null;
  onOpenChange: (open: boolean) => void;
};

export function RemoveMemberDialog({ businessId, member, onOpenChange }: RemoveMemberDialogProps) {
  const removeMember = useRemoveMember(businessId);

  const confirm = () => {
    if (!member) return;
    removeMember.mutate(member.id, {
      onSuccess: () => {
        toast.success(`${member.name} saiu da equipe.`);
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={member !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {member?.name} da equipe?</AlertDialogTitle>
          <AlertDialogDescription>
            A pessoa perde o acesso ao negócio
            {member?.professionalId ? ' e o perfil de profissional dela sai da agenda' : ''}. Para voltar, ela
            precisa de um novo convite.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeMember.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={removeMember.isPending} onClick={confirm}>
            {removeMember.isPending && <Spinner />}
            Remover da equipe
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
