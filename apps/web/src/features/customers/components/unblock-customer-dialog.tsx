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
import { useUnblockCustomer } from '../api/customers.mutations';
import { CustomerBlockType, type Customer } from '../types';

type UnblockCustomerDialogProps = {
  businessId: string;
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UnblockCustomerDialog({ businessId, customer, open, onOpenChange }: UnblockCustomerDialogProps) {
  const unblock = useUnblockCustomer(businessId, customer.id);
  const isFee = customer.activeBlock?.type === CustomerBlockType.FEE;

  const confirm = () =>
    unblock.mutate(undefined, {
      onSuccess: () => {
        toast.success(`${customer.name} desbloqueado.`);
        onOpenChange(false);
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desbloquear {customer.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            O cliente volta a agendar online agora.
            {isFee && ' A taxa não será cobrada; se ele já pagou, use “Registrar taxa paga”.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={unblock.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" disabled={unblock.isPending} onClick={confirm}>
            {unblock.isPending && <Spinner />}
            Desbloquear{isFee ? ' sem cobrar' : ''}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
