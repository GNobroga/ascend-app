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
import { useRemoveCustomer } from '../api/customers.mutations';
import type { Customer } from '../types';

type RemoveCustomerDialogProps = {
  businessId: string;
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
};

export function RemoveCustomerDialog({ businessId, customer, open, onOpenChange, onRemoved }: RemoveCustomerDialogProps) {
  const removeCustomer = useRemoveCustomer(businessId);

  const confirm = () =>
    removeCustomer.mutate(customer.id, {
      onSuccess: () => {
        toast.success('Cliente excluído.');
        onOpenChange(false);
        onRemoved();
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {customer.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            O cliente sai da lista e da busca. Os agendamentos já feitos continuam no histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeCustomer.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={removeCustomer.isPending} onClick={confirm}>
            {removeCustomer.isPending && <Spinner />}
            Excluir cliente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
