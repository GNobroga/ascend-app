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
import { useRevokeInvitation } from '../api/team.mutations';
import type { BusinessInvitation } from '../types';

type RevokeInvitationDialogProps = {
  businessId: string;
  invitation: BusinessInvitation | null;
  onOpenChange: (open: boolean) => void;
};

export function RevokeInvitationDialog({ businessId, invitation, onOpenChange }: RevokeInvitationDialogProps) {
  const revokeInvitation = useRevokeInvitation(businessId);

  const confirm = () => {
    if (!invitation) return;
    revokeInvitation.mutate(invitation.id, {
      onSuccess: () => {
        toast.success('Convite cancelado.');
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={invitation !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar o convite?</AlertDialogTitle>
          <AlertDialogDescription>
            O link enviado para {invitation?.email} deixa de funcionar. Você pode convidar de novo depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revokeInvitation.isPending}>Voltar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={revokeInvitation.isPending} onClick={confirm}>
            {revokeInvitation.isPending && <Spinner />}
            Cancelar convite
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
