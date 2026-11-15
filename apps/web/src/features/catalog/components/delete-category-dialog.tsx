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
import { useDeleteCategory } from '../api/catalog.mutations';
import type { ServiceCategory } from '../types';

type DeleteCategoryDialogProps = {
  businessId: string;
  category: ServiceCategory | null;
  serviceCount: number;
  onOpenChange: (open: boolean) => void;
};

export function DeleteCategoryDialog({ businessId, category, serviceCount, onOpenChange }: DeleteCategoryDialogProps) {
  const deleteCategory = useDeleteCategory(businessId);

  const confirm = () => {
    if (!category) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success('Categoria excluída.');
        onOpenChange(false);
      },
    });
  };

  const servicesMessage =
    serviceCount === 0
      ? 'Nenhum serviço está nesta categoria.'
      : `${serviceCount === 1 ? 'O serviço desta categoria continua' : `Os ${serviceCount} serviços desta categoria continuam`} no catálogo, sem categoria.`;

  return (
    <AlertDialog open={category !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{category?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>{servicesMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteCategory.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={deleteCategory.isPending} onClick={confirm}>
            {deleteCategory.isPending && <Spinner />}
            Excluir categoria
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
