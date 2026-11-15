import { cn } from '@packages/ui/lib/utils';
import { CircleDollarSignIcon } from 'lucide-react';
import { servicesSummary, STATUS_BLOCK_CLASSES, STATUS_LABELS } from '../appointment-status';
import { formatTime, toZoned } from '../calendar';
import { AppointmentPaymentStatus, AppointmentStatus, type Appointment } from '../types';

const SHORT_BLOCK_MINUTES = 35;

type AppointmentBlockProps = {
  appointment: Appointment;
  timeZone: string;
  showProfessional?: boolean;
  onOpen: () => void;
};

export function AppointmentBlock({ appointment, timeZone, showProfessional = false, onOpen }: AppointmentBlockProps) {
  const start = toZoned(appointment.startAt, timeZone);
  const end = toZoned(appointment.endAt, timeZone);
  const durationMinutes = (end.getTime() - start.getTime()) / 60_000;
  const isShort = durationMinutes < SHORT_BLOCK_MINUTES;
  const owesPayment =
    appointment.status === AppointmentStatus.COMPLETED && appointment.paymentStatus !== AppointmentPaymentStatus.PAID;
  const timeRange = `${formatTime(start)}–${formatTime(end)}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${timeRange}, ${appointment.customer.name}, ${STATUS_LABELS[appointment.status]}`}
      className={cn(
        'flex size-full flex-col overflow-hidden rounded-lg border px-2 py-1 text-left text-xs transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40',
        isShort && 'flex-row items-center gap-1.5 py-0',
        STATUS_BLOCK_CLASSES[appointment.status],
      )}
    >
      <span className="flex items-center gap-1 font-medium">
        <span className="truncate">{isShort ? formatTime(start) : timeRange}</span>
        {owesPayment && <CircleDollarSignIcon className="size-3.5 shrink-0 text-amber-600" aria-label="Pagamento pendente" />}
      </span>
      <span className="truncate font-medium">{appointment.customer.name}</span>
      {!isShort && <span className="truncate opacity-80">{servicesSummary(appointment)}</span>}
      {!isShort && showProfessional && <span className="truncate opacity-70">{appointment.professional.name}</span>}
    </button>
  );
}
