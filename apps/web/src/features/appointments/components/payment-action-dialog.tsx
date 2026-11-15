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
import { Field, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/format-currency';
import { usePaymentAction, type PaymentAction } from '../api/payments.mutations';
import type { Payment } from '../types';

const REASON_MAX_LENGTH = 500;

const COPY: Record<PaymentAction, { title: string; description: string; confirm: string; done: string }> = {
  refund: {
    title: 'Estornar pagamento',
    description: 'Use quando o dinheiro voltou para o cliente. O valor deixa de contar como recebido.',
    confirm: 'Estornar',
    done: 'Pagamento estornado.',
  },
  cancel: {
    title: 'Cancelar lançamento',
    description: 'Use quando o pagamento foi lançado por engano e o dinheiro nunca entrou.',
    confirm: 'Cancelar lançamento',
    done: 'Lançamento cancelado.',
  },
};

export type PendingPaymentAction = {
  payment: Payment;
  action: PaymentAction;
};

type PaymentActionDialogProps = {
  businessId: string;
  appointmentId: string;
  pending: PendingPaymentAction | null;
  onOpenChange: (open: boolean) => void;
};

export function PaymentActionDialog({ businessId, appointmentId, pending, onOpenChange }: PaymentActionDialogProps) {
  const [reason, setReason] = useState('');
  const paymentAction = usePaymentAction(businessId, appointmentId);
  const copy = pending ? COPY[pending.action] : null;

  const confirm = () => {
    if (!pending || !copy) return;
    paymentAction.mutate(
      { paymentId: pending.payment.id, action: pending.action, reason: reason.trim() || null },
      {
        onSuccess: () => {
          toast.success(copy.done);
          setReason('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <AlertDialog open={pending !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {copy?.title}
            {pending && ` de ${formatCurrency(pending.payment.amount)}`}?
          </AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="payment-action-reason">
            Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="payment-action-reason"
            rows={2}
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={paymentAction.isPending}>Voltar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={paymentAction.isPending} onClick={confirm}>
            {paymentAction.isPending && <Spinner />}
            {copy?.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
