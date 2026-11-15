import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BanIcon, EllipsisIcon, PlusIcon, Undo2Icon } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/format-currency';
import { appointmentQueries } from '../api/appointments.queries';
import { PAYMENT_LINE_LABELS, PAYMENT_STATUS_LABELS } from '../appointment-status';
import { toZoned } from '../calendar';
import { AppointmentStatus, PaymentStatus, type Appointment } from '../types';
import { PaymentActionDialog, type PendingPaymentAction } from './payment-action-dialog';
import { RegisterPaymentDialog } from './register-payment-dialog';

type AppointmentPaymentsProps = {
  businessId: string;
  appointment: Appointment;
  timeZone: string;
  canAct: boolean;
};

export function AppointmentPayments({ businessId, appointment, timeZone, canAct }: AppointmentPaymentsProps) {
  const { data: payments = [] } = useQuery(appointmentQueries.payments(businessId, appointment.id));
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingPaymentAction | null>(null);
  const canRegister =
    canAct && appointment.balance > 0 && appointment.status !== AppointmentStatus.CANCELLED;

  return (
    <section className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">Pagamento</h3>
        <Badge variant="secondary">{PAYMENT_STATUS_LABELS[appointment.paymentStatus]}</Badge>
      </div>

      <dl className="flex flex-col gap-1">
        <AmountRow label="Total" value={appointment.totalPrice} strong />
        <AmountRow label="Recebido" value={appointment.paidAmount} />
        {appointment.balance > 0 && <AmountRow label="Falta receber" value={appointment.balance} />}
      </dl>

      {payments.length > 0 && (
        <ul className="mt-1 flex flex-col divide-y rounded-2xl border">
          {payments.map((payment) => {
            const isPaid = payment.status === PaymentStatus.PAID;
            return (
              <li key={payment.id} className="flex items-start gap-2 px-3 py-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={cn('flex items-center gap-2', !isPaid && 'text-muted-foreground')}>
                    <span className={cn('font-medium tabular-nums', !isPaid && 'line-through')}>
                      {formatCurrency(payment.amount)}
                    </span>
                    <span className="truncate">{payment.paymentMethod.name}</span>
                    {!isPaid && <Badge variant="outline">{PAYMENT_LINE_LABELS[payment.status]}</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(toZoned(payment.paidAt, timeZone), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {payment.notes && (
                    <span className="text-xs whitespace-pre-line text-muted-foreground">{payment.notes}</span>
                  )}
                </div>
                {canAct && isPaid && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ações do pagamento de ${formatCurrency(payment.amount)}`}
                        />
                      }
                    >
                      <EllipsisIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuItem onClick={() => setPendingAction({ payment, action: 'refund' })}>
                        <Undo2Icon />
                        Estornar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingAction({ payment, action: 'cancel' })}
                      >
                        <BanIcon />
                        Cancelar lançamento
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canRegister && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setIsRegisterOpen(true)}>
          <PlusIcon />
          Registrar pagamento
        </Button>
      )}

      <RegisterPaymentDialog
        businessId={businessId}
        appointment={appointment}
        timeZone={timeZone}
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
      />
      <PaymentActionDialog
        businessId={businessId}
        appointmentId={appointment.id}
        pending={pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
      />
    </section>
  );
}

type AmountRowProps = {
  label: string;
  value: number;
  strong?: boolean;
};

function AmountRow({ label, value, strong = false }: AmountRowProps) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'font-medium')}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatCurrency(value)}</dd>
    </div>
  );
}
