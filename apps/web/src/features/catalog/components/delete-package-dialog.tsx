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
import { useDeletePackage } from '../api/catalog.mutations';
import type { Package } from '../types';

type DeletePackageDialogProps = {
  businessId: string;
  item: Package | null;
  onOpenChange: (open: boolean) => void;
};

export function DeletePackageDialog({ businessId, item, onOpenChange }: DeletePackageDialogProps) {
  const deletePackage = useDeletePackage(businessId);

  const confirm = () => {
    if (!item) return;
    deletePackage.mutate(item.id, {
      onSuccess: () => {
        toast.success('Pacote excluído.');
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={item !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{item?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            O pacote deixa de aparecer no catálogo e não pode mais ser agendado. Os serviços dele continuam
            existindo, e agendamentos já feitos ficam no histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletePackage.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={deletePackage.isPending} onClick={confirm}>
            {deletePackage.isPending && <Spinner />}
            Excluir pacote
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
