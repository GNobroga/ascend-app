import { AppointmentPaymentStatus, AppointmentStatus, PaymentStatus, type Appointment } from './types';

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'Pendente',
  [AppointmentStatus.CONFIRMED]: 'Confirmado',
  [AppointmentStatus.IN_PROGRESS]: 'Em atendimento',
  [AppointmentStatus.COMPLETED]: 'Concluído',
  [AppointmentStatus.CANCELLED]: 'Cancelado',
  [AppointmentStatus.NO_SHOW]: 'Faltou',
};

export const STATUS_BLOCK_CLASSES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'border-dashed border-amber-500/70 bg-amber-500/10 text-foreground',
  [AppointmentStatus.CONFIRMED]: 'border-primary/50 bg-primary/12 text-foreground',
  [AppointmentStatus.IN_PROGRESS]: 'border-emerald-500/70 bg-emerald-500/15 text-foreground ring-2 ring-emerald-500/30',
  [AppointmentStatus.COMPLETED]: 'border-border bg-muted text-muted-foreground',
  [AppointmentStatus.CANCELLED]: 'border-border bg-muted/60 text-muted-foreground line-through',
  [AppointmentStatus.NO_SHOW]: 'border-destructive/40 bg-destructive/10 text-muted-foreground line-through',
};

export const STATUS_DOT_CLASSES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'bg-amber-500',
  [AppointmentStatus.CONFIRMED]: 'bg-primary',
  [AppointmentStatus.IN_PROGRESS]: 'bg-emerald-500',
  [AppointmentStatus.COMPLETED]: 'bg-muted-foreground',
  [AppointmentStatus.CANCELLED]: 'bg-muted-foreground/50',
  [AppointmentStatus.NO_SHOW]: 'bg-destructive',
};

export const PAYMENT_STATUS_LABELS: Record<AppointmentPaymentStatus, string> = {
  [AppointmentPaymentStatus.UNPAID]: 'Não pago',
  [AppointmentPaymentStatus.PARTIAL]: 'Pago em parte',
  [AppointmentPaymentStatus.PAID]: 'Pago',
};

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

const STATUSES_AFTER_START: AppointmentStatus[] = [
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
];

export const ACTION_LABELS: Partial<Record<AppointmentStatus, string>> = {
  [AppointmentStatus.CONFIRMED]: 'Confirmar',
  [AppointmentStatus.IN_PROGRESS]: 'Iniciar atendimento',
  [AppointmentStatus.COMPLETED]: 'Concluir',
  [AppointmentStatus.NO_SHOW]: 'Marcar falta',
  [AppointmentStatus.CANCELLED]: 'Cancelar',
};

export type StatusAction = {
  status: AppointmentStatus;
  label: string;
  availableFrom: string | null;
};

export const statusActions = (appointment: Appointment, now: number): StatusAction[] =>
  TRANSITIONS[appointment.status].map((status) => ({
    status,
    label: ACTION_LABELS[status] ?? status,
    availableFrom:
      STATUSES_AFTER_START.includes(status) && new Date(appointment.startAt).getTime() > now
        ? appointment.startAt
        : null,
  }));

export const servicesSummary = (appointment: Appointment) =>
  appointment.package?.name ?? appointment.services.map(({ name }) => name).join(', ');

export const isOpen = (appointment: Appointment) =>
  appointment.status === AppointmentStatus.PENDING || appointment.status === AppointmentStatus.CONFIRMED;

export const isInactive = (appointment: Appointment) =>
  appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.NO_SHOW;

export const PAYMENT_LINE_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Pendente',
  [PaymentStatus.PAID]: 'Recebido',
  [PaymentStatus.REFUNDED]: 'Estornado',
  [PaymentStatus.CANCELLED]: 'Cancelado',
  [PaymentStatus.FAILED]: 'Falhou',
};
