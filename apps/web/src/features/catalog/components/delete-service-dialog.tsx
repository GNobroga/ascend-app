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
import { useDeleteService } from '../api/catalog.mutations';
import type { Service } from '../types';

type DeleteServiceDialogProps = {
  businessId: string;
  service: Service | null;
  onOpenChange: (open: boolean) => void;
};

export function DeleteServiceDialog({ businessId, service, onOpenChange }: DeleteServiceDialogProps) {
  const deleteService = useDeleteService(businessId);

  const confirm = () => {
    if (!service) return;
    deleteService.mutate(service.id, {
      onSuccess: () => {
        toast.success('Serviço excluído.');
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={service !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{service?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            O serviço deixa de aparecer no catálogo e não pode mais ser agendado. Agendamentos já feitos
            continuam no histórico. Para apenas pausar, prefira inativar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteService.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={deleteService.isPending} onClick={confirm}>
            {deleteService.isPending && <Spinner />}
            Excluir serviço
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
