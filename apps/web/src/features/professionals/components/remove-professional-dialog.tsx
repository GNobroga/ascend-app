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
import { useRemoveProfessional } from '../api/professionals.mutations';
import type { Professional } from '../types';

type RemoveProfessionalDialogProps = {
  businessId: string;
  professional: Professional;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
};

export function RemoveProfessionalDialog({
  businessId,
  professional,
  open,
  onOpenChange,
  onRemoved,
}: RemoveProfessionalDialogProps) {
  const removeProfessional = useRemoveProfessional(businessId);

  const confirm = () => {
    removeProfessional.mutate(professional.id, {
      onSuccess: () => {
        toast.success('Profissional removido.');
        onRemoved();
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover “{professional.displayName}” dos profissionais?</AlertDialogTitle>
          <AlertDialogDescription>
            Deixa de aparecer na agenda e não recebe novos agendamentos. A pessoa continua na equipe, e os
            agendamentos já feitos ficam no histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeProfessional.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={removeProfessional.isPending} onClick={confirm}>
            {removeProfessional.isPending && <Spinner />}
            Remover profissional
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
